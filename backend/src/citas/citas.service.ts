import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';
import { ActualizarEstadoCitaDto } from './dto/actualizar-estado-cita.dto';

@Injectable()
export class CitasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  findAll(empresaId: string, desde?: string, hasta?: string) {
    return this.prisma.cita.findMany({
      where: {
        empresaId,
        ...(desde || hasta
          ? {
              fechaInicio: {
                ...(desde ? { gte: new Date(desde) } : {}),
                ...(hasta ? { lte: new Date(hasta) } : {}),
              },
            }
          : {}),
      },
      include: { cliente: true, recurso: true, tipoCita: true },
      orderBy: { fechaInicio: 'asc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const cita = await this.prisma.cita.findFirst({
      where: { id, empresaId },
      include: { cliente: true, recurso: true, tipoCita: true },
    });

    if (!cita) {
      throw new NotFoundException('Cita no encontrada');
    }

    return cita;
  }

  private async validarSinTraslape(
    empresaId: string,
    recursoId: string,
    fechaInicio: Date,
    fechaFinConBuffer: Date,
    citaIdExcluir?: string,
  ) {
    const candidatas = await this.prisma.cita.findMany({
      where: {
        empresaId,
        recursoId,
        estado: { not: 'cancelada' },
        ...(citaIdExcluir ? { id: { not: citaIdExcluir } } : {}),
      },
      include: { tipoCita: true },
    });

    const hayTraslape = candidatas.some((existente) => {
      const finExistenteConBuffer = new Date(
        existente.fechaFin.getTime() + existente.tipoCita.bufferMinutos * 60000,
      );
      return (
        fechaInicio < finExistenteConBuffer && existente.fechaInicio < fechaFinConBuffer
      );
    });

    if (hayTraslape) {
      throw new ConflictException(
        'Ese recurso ya tiene una cita en ese horario (considerando el colchón entre citas)',
      );
    }
  }

  async create(empresaId: string, actorId: string, dto: CreateCitaDto) {
    const tipoCita = await this.prisma.tipoCita.findFirst({
      where: { id: dto.tipoCitaId, empresaId },
    });
    if (!tipoCita) {
      throw new NotFoundException('Tipo de cita no encontrado');
    }

    const recurso = await this.prisma.recurso.findFirst({
      where: { id: dto.recursoId, empresaId },
    });
    if (!recurso) {
      throw new NotFoundException('Recurso no encontrado');
    }

    const fechaInicio = new Date(dto.fechaInicio);
    const fechaFin = dto.fechaFin
      ? new Date(dto.fechaFin)
      : new Date(fechaInicio.getTime() + tipoCita.duracionMinutos * 60000);

    if (fechaFin <= fechaInicio) {
      throw new ConflictException('La hora de fin debe ser posterior a la hora de inicio');
    }

    const fechaFinConBuffer = new Date(
      fechaFin.getTime() + tipoCita.bufferMinutos * 60000,
    );

    await this.validarSinTraslape(empresaId, dto.recursoId, fechaInicio, fechaFinConBuffer);

    const cita = await this.prisma.cita.create({
      data: {
        empresaId,
        clienteId: dto.clienteId,
        recursoId: dto.recursoId,
        tipoCitaId: dto.tipoCitaId,
        fechaInicio,
        fechaFin,
        notas: dto.notas,
      },
      include: { cliente: true, recurso: true, tipoCita: true },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'crear',
      entidad: 'cita',
      entidadId: cita.id,
    });

    if (cita.recurso.usuarioId) {
      await this.notificacionesService.crear({
        empresaId,
        usuarioId: cita.recurso.usuarioId,
        tipo: 'cita_asignada',
        titulo: 'Nueva cita asignada',
        mensaje: `${cita.tipoCita.nombre} el ${cita.fechaInicio.toLocaleString('es-EC')}${cita.cliente ? ` con ${cita.cliente.nombre}` : ''}`,
        enlace: '/citas',
      });
    }

    return cita;
  }

  async update(empresaId: string, actorId: string, id: string, dto: UpdateCitaDto) {
    const existente = await this.findOne(empresaId, id);

    const recursoId = dto.recursoId ?? existente.recursoId;
    const tipoCitaId = dto.tipoCitaId ?? existente.tipoCitaId;

    const tipoCita =
      dto.tipoCitaId && dto.tipoCitaId !== existente.tipoCitaId
        ? await this.prisma.tipoCita.findFirst({ where: { id: tipoCitaId, empresaId } })
        : existente.tipoCita;
    if (!tipoCita) {
      throw new NotFoundException('Tipo de cita no encontrado');
    }

    if (dto.recursoId && dto.recursoId !== existente.recursoId) {
      const recurso = await this.prisma.recurso.findFirst({
        where: { id: recursoId, empresaId },
      });
      if (!recurso) {
        throw new NotFoundException('Recurso no encontrado');
      }
    }

    const fechaInicio = dto.fechaInicio ? new Date(dto.fechaInicio) : existente.fechaInicio;
    const fechaFin = dto.fechaFin
      ? new Date(dto.fechaFin)
      : dto.fechaInicio || dto.tipoCitaId
        ? new Date(fechaInicio.getTime() + tipoCita.duracionMinutos * 60000)
        : existente.fechaFin;

    if (fechaFin <= fechaInicio) {
      throw new ConflictException('La hora de fin debe ser posterior a la hora de inicio');
    }

    const fechaFinConBuffer = new Date(
      fechaFin.getTime() + tipoCita.bufferMinutos * 60000,
    );

    await this.validarSinTraslape(empresaId, recursoId, fechaInicio, fechaFinConBuffer, id);

    const cita = await this.prisma.cita.update({
      where: { id },
      data: {
        recursoId,
        tipoCitaId,
        clienteId: dto.clienteId === '' ? null : (dto.clienteId ?? existente.clienteId),
        fechaInicio,
        fechaFin,
        notas: dto.notas ?? existente.notas,
        ...(dto.fechaInicio || dto.fechaFin ? { recordatorioEnviado: false } : {}),
      },
      include: { cliente: true, recurso: true, tipoCita: true },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'cita',
      entidadId: id,
    });

    return cita;
  }

  async remove(empresaId: string, actorId: string, id: string) {
    await this.findOne(empresaId, id);

    await this.prisma.cita.delete({ where: { id } });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'eliminar',
      entidad: 'cita',
      entidadId: id,
    });

    return { success: true };
  }

  async actualizarEstado(
    empresaId: string,
    actorId: string,
    id: string,
    dto: ActualizarEstadoCitaDto,
  ) {
    await this.findOne(empresaId, id);

    const cita = await this.prisma.cita.update({
      where: { id },
      data: { estado: dto.estado },
      include: { cliente: true, recurso: true, tipoCita: true },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'cita',
      entidadId: id,
      detalle: { estado: dto.estado },
    });

    return cita;
  }
}
