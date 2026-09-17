import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicionDto } from './dto/create-medicion.dto';
import { UpdateMedicionDto } from './dto/update-medicion.dto';
import { calcularMedicion, type Sexo } from './calculos';

const INCLUDE_CLIENTE_SEXO = {
  cliente: { select: { sexo: true } },
} as const;

@Injectable()
export class MedicionesService {
  constructor(private readonly prisma: PrismaService) {}

  private conCalculos<T extends { peso: unknown; talla: unknown; perimetroCuello: unknown; perimetroCintura: unknown; perimetroCadera: unknown; cliente: { sexo: string | null } }>(
    medicion: T,
  ) {
    const { cliente, ...resto } = medicion;
    const calculos = calcularMedicion({
      peso: Number(medicion.peso),
      talla: Number(medicion.talla),
      perimetroCuello: medicion.perimetroCuello != null ? Number(medicion.perimetroCuello) : null,
      perimetroCintura: medicion.perimetroCintura != null ? Number(medicion.perimetroCintura) : null,
      perimetroCadera: medicion.perimetroCadera != null ? Number(medicion.perimetroCadera) : null,
      sexo: (cliente.sexo as Sexo | null) ?? null,
    });
    return { ...resto, calculos };
  }

  async findAllPorCliente(empresaId: string, clienteId: string) {
    const cliente = await this.prisma.cliente.findFirst({ where: { id: clienteId, empresaId } });
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const mediciones = await this.prisma.medicionCorporal.findMany({
      where: { empresaId, clienteId },
      include: INCLUDE_CLIENTE_SEXO,
      orderBy: { fecha: 'asc' },
    });

    return mediciones.map((m) => this.conCalculos(m));
  }

  async findOne(empresaId: string, id: string) {
    const medicion = await this.prisma.medicionCorporal.findFirst({
      where: { id, empresaId },
      include: INCLUDE_CLIENTE_SEXO,
    });
    if (!medicion) {
      throw new NotFoundException('Medición no encontrada');
    }
    return medicion;
  }

  async create(empresaId: string, actorId: string, dto: CreateMedicionDto) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: dto.clienteId, empresaId },
    });
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const medicion = await this.prisma.medicionCorporal.create({
      data: {
        empresaId,
        clienteId: dto.clienteId,
        fecha: new Date(dto.fecha),
        peso: dto.peso,
        talla: dto.talla,
        perimetroCuello: dto.perimetroCuello,
        perimetroCintura: dto.perimetroCintura,
        perimetroCadera: dto.perimetroCadera,
        perimetroPecho: dto.perimetroPecho,
        masaMuscular: dto.masaMuscular,
        notas: dto.notas,
        usuarioId: actorId,
      },
      include: INCLUDE_CLIENTE_SEXO,
    });

    return this.conCalculos(medicion);
  }

  async update(empresaId: string, id: string, dto: UpdateMedicionDto) {
    await this.findOne(empresaId, id);

    const medicion = await this.prisma.medicionCorporal.update({
      where: { id },
      data: {
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        peso: dto.peso,
        talla: dto.talla,
        perimetroCuello: dto.perimetroCuello,
        perimetroCintura: dto.perimetroCintura,
        perimetroCadera: dto.perimetroCadera,
        perimetroPecho: dto.perimetroPecho,
        masaMuscular: dto.masaMuscular,
        notas: dto.notas,
      },
      include: INCLUDE_CLIENTE_SEXO,
    });

    return this.conCalculos(medicion);
  }

  async remove(empresaId: string, id: string) {
    await this.findOne(empresaId, id);
    await this.prisma.medicionCorporal.delete({ where: { id } });
    return { success: true };
  }
}
