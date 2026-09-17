import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTipoCitaDto } from './dto/create-tipo-cita.dto';
import { UpdateTipoCitaDto } from './dto/update-tipo-cita.dto';

@Injectable()
export class TiposCitaService {
  constructor(private readonly prisma: PrismaService) {}

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

    return tipoCita;
  }

  async update(empresaId: string, actorId: string, id: string, dto: UpdateTipoCitaDto) {
    await this.findOne(empresaId, id);

    const tipoCita = await this.prisma.tipoCita.update({ where: { id }, data: dto });

    return tipoCita;
  }
}
