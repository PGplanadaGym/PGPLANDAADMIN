import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateTipoCitaDto } from './dto/create-tipo-cita.dto';

@Injectable()
export class TiposCitaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  findAll(empresaId: string) {
    return this.prisma.tipoCita.findMany({
      where: { empresaId, activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const tipoCita = await this.prisma.tipoCita.findFirst({ where: { id, empresaId } });

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
        duracionMinutos: dto.duracionMinutos,
        bufferMinutos: dto.bufferMinutos ?? 0,
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
}
