import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecursoDto } from './dto/create-recurso.dto';
import { UpdateRecursoDto } from './dto/update-recurso.dto';
import { SetHorariosDto } from './dto/horario.dto';
import { CreateBloqueoDto } from './dto/bloqueo.dto';
import { SetTiposCitaDto } from './dto/set-tipos-cita.dto';

@Injectable()
export class RecursosService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeRecurso = {
    horarios: true,
    sucursal: { select: { id: true, nombre: true } },
    usuario: { select: { id: true, nombre: true } },
    tiposCita: { select: { id: true, nombre: true } },
    bloqueos: {
      where: { fecha: { gte: new Date(new Date().toISOString().slice(0, 10)) } },
      orderBy: { fecha: 'asc' as const },
    },
  };

  findAll(empresaId: string, incluirInactivos = false) {
    return this.prisma.recurso.findMany({
      where: { empresaId, ...(incluirInactivos ? {} : { activo: true }) },
      include: this.includeRecurso,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const recurso = await this.prisma.recurso.findFirst({
      where: { id, empresaId },
      include: this.includeRecurso,
    });

    if (!recurso) {
      throw new NotFoundException('Recurso no encontrado');
    }

    return recurso;
  }

  private async validarUsuarioDeLaEmpresa(empresaId: string, usuarioId: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId },
    });
    if (!usuario) {
      throw new BadRequestException('El empleado seleccionado no pertenece a tu empresa');
    }
  }

  async create(empresaId: string, actorId: string, dto: CreateRecursoDto) {
    // Vincular un empleado solo tiene sentido para un recurso tipo "persona" — si el
    // formulario llegara a mandar un usuarioId con otro tipo (ej. bug de UI), se ignora.
    const usuarioId = dto.tipo === 'persona' ? dto.usuarioId : undefined;

    if (usuarioId) {
      await this.validarUsuarioDeLaEmpresa(empresaId, usuarioId);
    }

    const recurso = await this.prisma.recurso.create({
      data: {
        empresaId,
        nombre: dto.nombre,
        tipo: dto.tipo,
        usuarioId,
        sucursalId: dto.sucursalId,
      },
    });

    return recurso;
  }

  async update(empresaId: string, actorId: string, id: string, dto: UpdateRecursoDto) {
    const existente = await this.findOne(empresaId, id);

    const tipoResuelto = dto.tipo ?? existente.tipo;
    // Igual que en create(): un vínculo a empleado solo tiene sentido para tipo "persona".
    // Si el tipo cambia a "sala"/"equipo" (o ya lo era), se limpia cualquier usuarioId.
    const usuarioId =
      tipoResuelto === 'persona' ? (dto.usuarioId === '' ? null : dto.usuarioId) : null;

    if (usuarioId) {
      await this.validarUsuarioDeLaEmpresa(empresaId, usuarioId);
    }

    const recurso = await this.prisma.recurso.update({
      where: { id },
      data: { ...dto, usuarioId },
    });

    return recurso;
  }

  async setHorarios(empresaId: string, id: string, dto: SetHorariosDto) {
    await this.findOne(empresaId, id);

    await this.prisma.horarioAtencion.deleteMany({ where: { recursoId: id } });
    await this.prisma.horarioAtencion.createMany({
      data: dto.horarios.map((h) => ({
        recursoId: id,
        diaSemana: h.diaSemana,
        horaInicio: h.horaInicio,
        horaFin: h.horaFin,
      })),
    });

    return this.findOne(empresaId, id);
  }

  async setTiposCita(empresaId: string, id: string, dto: SetTiposCitaDto) {
    await this.findOne(empresaId, id);

    if (dto.tipoCitaIds.length > 0) {
      const cantidadValida = await this.prisma.tipoCita.count({
        where: { id: { in: dto.tipoCitaIds }, empresaId },
      });
      if (cantidadValida !== dto.tipoCitaIds.length) {
        throw new BadRequestException('Uno o más tipos de cita no pertenecen a tu empresa');
      }
    }

    await this.prisma.recurso.update({
      where: { id },
      data: { tiposCita: { set: dto.tipoCitaIds.map((tipoCitaId) => ({ id: tipoCitaId })) } },
    });

    return this.findOne(empresaId, id);
  }

  async crearBloqueo(empresaId: string, id: string, dto: CreateBloqueoDto) {
    await this.findOne(empresaId, id);

    if ((dto.horaInicio && !dto.horaFin) || (!dto.horaInicio && dto.horaFin)) {
      throw new BadRequestException('Si defines una hora de inicio, también debes definir la hora de fin');
    }

    await this.prisma.bloqueoDisponibilidad.create({
      data: {
        recursoId: id,
        fecha: new Date(dto.fecha),
        horaInicio: dto.horaInicio,
        horaFin: dto.horaFin,
        motivo: dto.motivo,
      },
    });

    return this.findOne(empresaId, id);
  }

  async eliminarBloqueo(empresaId: string, id: string, bloqueoId: string) {
    await this.findOne(empresaId, id);

    const bloqueo = await this.prisma.bloqueoDisponibilidad.findFirst({
      where: { id: bloqueoId, recursoId: id },
    });
    if (!bloqueo) {
      throw new NotFoundException('Bloqueo no encontrado');
    }

    await this.prisma.bloqueoDisponibilidad.delete({ where: { id: bloqueoId } });

    return this.findOne(empresaId, id);
  }
}
