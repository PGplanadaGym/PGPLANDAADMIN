import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateClienteDto } from './dto/create-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  findAll(empresaId: string) {
    return this.prisma.cliente.findMany({ where: { empresaId } });
  }

  async findOne(empresaId: string, id: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, empresaId },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return cliente;
  }

  async create(empresaId: string, actorId: string, dto: CreateClienteDto) {
    const cliente = await this.prisma.cliente.create({
      data: {
        empresaId,
        nombre: dto.nombre,
        email: dto.email,
        telefono: dto.telefono,
        atributosExtra: dto.atributosExtra as Prisma.InputJsonValue | undefined,
      },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'crear',
      entidad: 'cliente',
      entidadId: cliente.id,
      detalle: { nombre: cliente.nombre },
    });

    return cliente;
  }

  async findPerfil(empresaId: string, id: string) {
    const cliente = await this.findOne(empresaId, id);

    const [
      totalCitas,
      citas,
      ordenes,
      costeos,
      movimientosCuenta,
      activosAsignados,
    ] = await Promise.all([
      this.prisma.cita.count({ where: { empresaId, clienteId: id } }),
      this.prisma.cita.findMany({
        where: { empresaId, clienteId: id },
        include: {
          tipoCita: true,
          recurso: { select: { id: true, nombre: true } },
        },
        orderBy: { fechaInicio: 'desc' },
        take: 10,
      }),
      this.prisma.orden.findMany({
        where: { empresaId, clienteId: id },
        include: {
          items: {
            include: { producto: { select: { id: true, nombre: true } } },
          },
        },
        orderBy: { creadoEn: 'desc' },
        take: 10,
      }),
      this.prisma.costeoProyecto.findMany({
        where: { empresaId, clienteId: id },
        orderBy: { creadoEn: 'desc' },
        take: 10,
      }),
      this.prisma.movimientoCuenta.findMany({
        where: { empresaId, clienteId: id },
        include: { categoria: true },
        orderBy: { fecha: 'desc' },
        take: 10,
      }),
      this.prisma.asignacionActivo.findMany({
        where: { empresaId, clienteId: id, fechaDevolucion: null },
        include: { activo: { select: { id: true, nombre: true } } },
      }),
    ]);

    const totalGastadoVentas = ordenes.reduce(
      (suma, orden) => suma + Number(orden.total),
      0,
    );
    const totalGastadoCosteos = costeos
      .filter((c) => c.estado === 'vendido' && c.precioVenta != null)
      .reduce((suma, c) => suma + Number(c.precioVenta), 0);

    return {
      cliente,
      citas,
      ordenes,
      costeos,
      movimientosCuenta,
      activosAsignados,
      resumen: {
        totalCitas,
        totalGastado: totalGastadoVentas + totalGastadoCosteos,
        activosEnPosesion: activosAsignados.length,
      },
    };
  }
}
