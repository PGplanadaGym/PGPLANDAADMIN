import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateCategoriaActivoDto } from './dto/create-categoria-activo.dto';
import { CreateActivoDto } from './dto/create-activo.dto';
import { AsignarActivoDto } from './dto/asignar-activo.dto';
import { DevolverActivoDto } from './dto/devolver-activo.dto';

const SELECT_USUARIO_BASICO = {
  id: true,
  nombre: true,
  email: true,
  fotoUrl: true,
} as const;

const INCLUDE_ACTIVO = {
  categoriaActivo: true,
  sucursal: { select: { id: true, nombre: true } },
  asignaciones: {
    where: { fechaDevolucion: null },
    include: { usuario: { select: SELECT_USUARIO_BASICO }, cliente: true },
    take: 1,
  },
} as const;

@Injectable()
export class ActivosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  findAllCategorias(empresaId: string) {
    return this.prisma.categoriaActivo.findMany({
      where: { empresaId, activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async createCategoria(empresaId: string, dto: CreateCategoriaActivoDto) {
    return this.prisma.categoriaActivo.create({
      data: { empresaId, nombre: dto.nombre },
    });
  }

  findAllActivos(empresaId: string) {
    return this.prisma.activo.findMany({
      where: { empresaId },
      include: INCLUDE_ACTIVO,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOneActivo(empresaId: string, id: string) {
    const activo = await this.prisma.activo.findFirst({
      where: { id, empresaId },
      include: INCLUDE_ACTIVO,
    });

    if (!activo) {
      throw new NotFoundException('Activo no encontrado');
    }

    return activo;
  }

  async createActivo(empresaId: string, actorId: string, dto: CreateActivoDto) {
    const categoria = await this.prisma.categoriaActivo.findFirst({
      where: { id: dto.categoriaActivoId, empresaId },
    });
    if (!categoria) {
      throw new NotFoundException('Categoría de activo no encontrada');
    }

    const activo = await this.prisma.activo.create({
      data: {
        empresaId,
        categoriaActivoId: dto.categoriaActivoId,
        nombre: dto.nombre,
        codigoInterno: dto.codigoInterno,
        numeroSerie: dto.numeroSerie,
        valorCompra: dto.valorCompra,
        fechaCompra: dto.fechaCompra ? new Date(dto.fechaCompra) : undefined,
        notas: dto.notas,
        sucursalId: dto.sucursalId,
      },
      include: INCLUDE_ACTIVO,
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'crear',
      entidad: 'activo',
      entidadId: activo.id,
      detalle: { nombre: activo.nombre },
    });

    return activo;
  }

  async findHistorial(empresaId: string, activoId: string) {
    await this.findOneActivo(empresaId, activoId);

    return this.prisma.asignacionActivo.findMany({
      where: { activoId, empresaId },
      include: {
        usuario: { select: SELECT_USUARIO_BASICO },
        cliente: true,
        asignadoPor: { select: SELECT_USUARIO_BASICO },
      },
      orderBy: { fechaAsignacion: 'desc' },
    });
  }

  async asignar(
    empresaId: string,
    actorId: string,
    activoId: string,
    dto: AsignarActivoDto,
  ) {
    if (!dto.usuarioId && !dto.clienteId) {
      throw new BadRequestException(
        'Debes indicar un usuario o un cliente para asignar el activo',
      );
    }
    if (dto.usuarioId && dto.clienteId) {
      throw new BadRequestException(
        'Solo puede asignarse a un usuario o a un cliente, no ambos',
      );
    }

    const activo = await this.findOneActivo(empresaId, activoId);
    if (activo.estado === 'baja') {
      throw new ConflictException(
        'Este activo está dado de baja y no puede asignarse',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const asignacionAbierta = activo.asignaciones[0];
      if (asignacionAbierta) {
        await tx.asignacionActivo.update({
          where: { id: asignacionAbierta.id },
          data: { fechaDevolucion: new Date() },
        });
      }

      await tx.asignacionActivo.create({
        data: {
          empresaId,
          activoId,
          usuarioId: dto.usuarioId,
          clienteId: dto.clienteId,
          notas: dto.notas,
          asignadoPorId: actorId,
        },
      });

      await tx.activo.update({
        where: { id: activoId },
        data: { estado: 'asignado' },
      });
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'activo',
      entidadId: activoId,
      detalle: { asignadoA: dto.usuarioId ?? dto.clienteId },
    });

    return this.findOneActivo(empresaId, activoId);
  }

  async devolver(
    empresaId: string,
    actorId: string,
    activoId: string,
    dto: DevolverActivoDto,
  ) {
    const activo = await this.findOneActivo(empresaId, activoId);
    const asignacionAbierta = activo.asignaciones[0];
    if (!asignacionAbierta) {
      throw new ConflictException(
        'Este activo no tiene una asignación vigente',
      );
    }

    await this.prisma.$transaction([
      this.prisma.asignacionActivo.update({
        where: { id: asignacionAbierta.id },
        data: {
          fechaDevolucion: new Date(),
          notas: dto.notas ?? asignacionAbierta.notas,
        },
      }),
      this.prisma.activo.update({
        where: { id: activoId },
        data: { estado: 'disponible' },
      }),
    ]);

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'activo',
      entidadId: activoId,
      detalle: { devuelto: true },
    });

    return this.findOneActivo(empresaId, activoId);
  }
}
