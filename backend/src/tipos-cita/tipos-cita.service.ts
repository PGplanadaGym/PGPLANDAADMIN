import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateTipoCitaDto } from './dto/create-tipo-cita.dto';
import { UpdateTipoCitaDto } from './dto/update-tipo-cita.dto';

@Injectable()
export class TiposCitaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  private readonly includeTipoCita = {
    recursos: { select: { id: true, nombre: true } },
  };

  findAll(empresaId: string, incluirInactivos = false) {
    return this.prisma.tipoCita.findMany({
      where: { empresaId, ...(incluirInactivos ? {} : { activo: true }) },
      include: this.includeTipoCita,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const tipoCita = await this.prisma.tipoCita.findFirst({
      where: { id, empresaId },
      include: this.includeTipoCita,
    });

    if (!tipoCita) {
      throw new NotFoundException('Tipo de cita no encontrado');
    }

    return tipoCita;
  }

  async create(empresaId: string, actorId: string, dto: CreateTipoCitaDto) {
    const tipoCita = await this.prisma.tipoCita.create({
      data: {
        empresaId,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        duracionMinutos: dto.duracionMinutos,
        bufferMinutos: dto.bufferMinutos ?? 0,
        precio: dto.precio,
        color: dto.color ?? '#0F172A',
      },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'crear',
      entidad: 'tipo_cita',
      entidadId: tipoCita.id,
      detalle: { nombre: tipoCita.nombre },
    });

    return tipoCita;
  }

  async update(empresaId: string, actorId: string, id: string, dto: UpdateTipoCitaDto) {
    await this.findOne(empresaId, id);

    const tipoCita = await this.prisma.tipoCita.update({ where: { id }, data: dto });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'tipo_cita',
      entidadId: id,
      detalle: {
        camposEditados: Object.entries(dto)
          .filter(([, valor]) => valor !== undefined)
          .map(([clave]) => clave),
      },
    });

    return tipoCita;
  }
}
