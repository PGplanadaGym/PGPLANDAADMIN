import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { toZonedTime } from 'date-fns-tz';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';
import { ActualizarEstadoCitaDto } from './dto/actualizar-estado-cita.dto';

const INCLUDE_CITA = {
  cliente: true,
  recurso: true,
  tipoCita: true,
  movimientosCuenta: { select: { id: true, monto: true } },
};

@Injectable()
export class CitasService {
  constructor(
    private readonly prisma: PrismaService,
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
      include: INCLUDE_CITA,
      orderBy: { fechaInicio: 'asc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const cita = await this.prisma.cita.findFirst({
      where: { id, empresaId },
      include: INCLUDE_CITA,
    });

    if (!cita) {
      throw new NotFoundException('Cita no encontrada');
    }

    return cita;
  }

  private async zonaHorariaDe(empresaId: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { zonaHoraria: true },
    });
    return empresa?.zonaHoraria ?? 'America/Guayaquil';
  }

  /**
   * Un recurso puede tener horarios de atención configurados (ej. Lunes a Viernes 9:00-18:00).
   * Si no tiene ninguno configurado, no se restringe nada (evita romper recursos que nunca
   * definieron su horario). Si sí tiene, la cita completa debe caer dentro de un mismo día y
   * dentro de una de las ventanas configuradas para ese día de la semana.
   */
  private async validarDentroDeHorario(
    empresaId: string,
    recursoId: string,
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    const horarios = await this.prisma.horarioAtencion.findMany({ where: { recursoId } });
    if (horarios.length === 0) return;

    const zonaHoraria = await this.zonaHorariaDe(empresaId);
    const inicioZonado = toZonedTime(fechaInicio, zonaHoraria);
    const finZonado = toZonedTime(fechaFin, zonaHoraria);

    const aMinutos = (fecha: Date) => fecha.getHours() * 60 + fecha.getMinutes();
    const inicioMin = aMinutos(inicioZonado);
    const finMin = aMinutos(finZonado);

    const dentroDeAlgunaVentana =
      inicioZonado.getDay() === finZonado.getDay() &&
      horarios
        .filter((h) => h.diaSemana === inicioZonado.getDay())
        .some((h) => {
          const [horaIniH, horaIniM] = h.horaInicio.split(':').map(Number);
          const [horaFinH, horaFinM] = h.horaFin.split(':').map(Number);
          return (
            inicioMin >= horaIniH * 60 + horaIniM && finMin <= horaFinH * 60 + horaFinM
          );
        });

    if (!dentroDeAlgunaVentana) {
      throw new ConflictException(
        'Ese horario está fuera del horario de atención configurado para este recurso',
      );
    }
  }

  /**
   * Si un recurso tiene tipos de cita configurados (qué servicios ofrece), la cita solo puede
   * ser de uno de esos. Si no tiene ninguno configurado, no se restringe nada (ofrece todos).
   */
  private async validarTipoCitaPermitido(recursoId: string, tipoCitaId: string) {
    const recurso = await this.prisma.recurso.findUnique({
      where: { id: recursoId },
      select: { tiposCita: { select: { id: true } } },
    });
    if (!recurso || recurso.tiposCita.length === 0) return;

    if (!recurso.tiposCita.some((t) => t.id === tipoCitaId)) {
      throw new BadRequestException('Este recurso no ofrece ese tipo de cita');
    }
  }

  /**
   * Bloqueos puntuales de disponibilidad (vacaciones, día libre…), distintos del horario
   * semanal recurrente. Un bloqueo sin horaInicio/horaFin cubre el día completo; con ambos,
   * solo esa franja.
   */
  private async validarSinBloqueo(
    empresaId: string,
    recursoId: string,
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    const zonaHoraria = await this.zonaHorariaDe(empresaId);
    const inicioZonado = toZonedTime(fechaInicio, zonaHoraria);
    const finZonado = toZonedTime(fechaFin, zonaHoraria);

    const anio = inicioZonado.getFullYear();
    const mes = String(inicioZonado.getMonth() + 1).padStart(2, '0');
    const dia = String(inicioZonado.getDate()).padStart(2, '0');
    const fechaSql = new Date(`${anio}-${mes}-${dia}`);

    const bloqueos = await this.prisma.bloqueoDisponibilidad.findMany({
      where: { recursoId, fecha: fechaSql },
    });
    if (bloqueos.length === 0) return;

    const aMinutos = (fecha: Date) => fecha.getHours() * 60 + fecha.getMinutes();
    const inicioMin = aMinutos(inicioZonado);
    const finMin = aMinutos(finZonado);

    const hayBloqueo = bloqueos.some((b) => {
      if (!b.horaInicio || !b.horaFin) return true; // día completo bloqueado
      const [bIniH, bIniM] = b.horaInicio.split(':').map(Number);
      const [bFinH, bFinM] = b.horaFin.split(':').map(Number);
      const bloqueoInicioMin = bIniH * 60 + bIniM;
      const bloqueoFinMin = bFinH * 60 + bFinM;
      return inicioMin < bloqueoFinMin && bloqueoInicioMin < finMin;
    });

    if (hayBloqueo) {
      throw new ConflictException('Este recurso no está disponible en esa fecha/hora');
    }
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

    await this.validarTipoCitaPermitido(dto.recursoId, dto.tipoCitaId);
    await this.validarDentroDeHorario(empresaId, dto.recursoId, fechaInicio, fechaFin);
    await this.validarSinBloqueo(empresaId, dto.recursoId, fechaInicio, fechaFin);
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
      include: INCLUDE_CITA,
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

    await this.validarTipoCitaPermitido(recursoId, tipoCitaId);
    await this.validarDentroDeHorario(empresaId, recursoId, fechaInicio, fechaFin);
    await this.validarSinBloqueo(empresaId, recursoId, fechaInicio, fechaFin);
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
      include: INCLUDE_CITA,
    });

    return cita;
  }

  async remove(empresaId: string, actorId: string, id: string) {
    await this.findOne(empresaId, id);

    await this.prisma.cita.delete({ where: { id } });

    return { success: true };
  }

  async actualizarEstado(
    empresaId: string,
    actorId: string,
    id: string,
    dto: ActualizarEstadoCitaDto,
  ) {
    const existente = await this.findOne(empresaId, id);

    if (dto.estado === 'completada' && dto.categoriaIngresoId) {
      await this.registrarCobro(empresaId, actorId, existente, dto.categoriaIngresoId, dto.monto);
    }

    const cita = await this.prisma.cita.update({
      where: { id },
      data: { estado: dto.estado },
      include: INCLUDE_CITA,
    });

    return cita;
  }

  /**
   * Registra el cobro de una cita como ingreso en Cuentas — igual que Ventas, es
   * opcional (el estado "completada" no obliga a cobrar aquí). Si ya se registró un cobro
   * para esta misma cita, no se permite duplicarlo.
   */
  private async registrarCobro(
    empresaId: string,
    actorId: string,
    cita: { id: string; clienteId: string | null; tipoCita: { nombre: string; precio: unknown } },
    categoriaIngresoId: string,
    montoOverride?: number,
  ) {
    const yaCobrada = await this.prisma.movimientoCuenta.findFirst({
      where: { citaId: cita.id },
    });
    if (yaCobrada) {
      throw new ConflictException('Ya se registró un cobro para esta cita');
    }

    const categoria = await this.prisma.categoriaMovimiento.findFirst({
      where: { id: categoriaIngresoId, empresaId, tipo: 'ingreso' },
    });
    if (!categoria) {
      throw new BadRequestException('Categoría de ingreso no encontrada');
    }

    const monto = montoOverride ?? Number(cita.tipoCita.precio ?? 0);
    if (!monto || monto <= 0) {
      throw new BadRequestException(
        'Este tipo de cita no tiene precio configurado — indica un monto',
      );
    }

    await this.prisma.movimientoCuenta.create({
      data: {
        empresaId,
        tipo: 'ingreso',
        categoriaId: categoriaIngresoId,
        monto,
        fecha: new Date(),
        descripcion: `Cita: ${cita.tipoCita.nombre}`,
        clienteId: cita.clienteId,
        usuarioId: actorId,
        citaId: cita.id,
      },
    });
  }
}
