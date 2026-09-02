import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateRecursoDto } from './dto/create-recurso.dto';
import { SetHorariosDto } from './dto/horario.dto';

@Injectable()
export class RecursosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  findAll(empresaId: string) {
    return this.prisma.recurso.findMany({
      where: { empresaId, activo: true },
      include: {
        horarios: true,
        sucursal: { select: { id: true, nombre: true } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const recurso = await this.prisma.recurso.findFirst({
      where: { id, empresaId },
      include: {
        horarios: true,
        sucursal: { select: { id: true, nombre: true } },
      },
    });

    if (!recurso) {
      throw new NotFoundException('Recurso no encontrado');
    }

    return recurso;
  }

  async create(empresaId: string, actorId: string, dto: CreateRecursoDto) {
    const recurso = await this.prisma.recurso.create({
      data: {
        empresaId,
        nombre: dto.nombre,
        tipo: dto.tipo,
        usuarioId: dto.usuarioId,
        sucursalId: dto.sucursalId,
      },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'crear',
      entidad: 'recurso',
      entidadId: recurso.id,
      detalle: { nombre: recurso.nombre },
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
}
