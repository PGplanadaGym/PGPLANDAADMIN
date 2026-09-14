import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanMembresiaDto } from './dto/create-plan-membresia.dto';
import { UpdatePlanMembresiaDto } from './dto/update-plan-membresia.dto';

@Injectable()
export class PlanesMembresiaService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(empresaId: string, incluirInactivos = false) {
    return this.prisma.planMembresia.findMany({
      where: { empresaId, ...(incluirInactivos ? {} : { activo: true }) },
      orderBy: { duracionDias: 'asc' },
    });
  }

  create(empresaId: string, dto: CreatePlanMembresiaDto) {
    return this.prisma.planMembresia.create({
      data: {
        empresaId,
        nombre: dto.nombre,
        duracionDias: dto.duracionDias,
        precio: dto.precio,
        activo: dto.activo ?? true,
      },
    });
  }

  async update(empresaId: string, id: string, dto: UpdatePlanMembresiaDto) {
    const plan = await this.prisma.planMembresia.findFirst({ where: { id, empresaId } });
    if (!plan) {
      throw new NotFoundException('Plan de membresía no encontrado');
    }

    return this.prisma.planMembresia.update({ where: { id }, data: dto });
  }

  async remove(empresaId: string, id: string) {
    const plan = await this.prisma.planMembresia.findFirst({ where: { id, empresaId } });
    if (!plan) {
      throw new NotFoundException('Plan de membresía no encontrado');
    }

    const enUso = await this.prisma.membresia.count({ where: { planId: id } });
    if (enUso > 0) {
      throw new ConflictException(
        'Este plan ya se usó en membresías y no se puede eliminar. Desactívalo en su lugar.',
      );
    }

    await this.prisma.planMembresia.delete({ where: { id } });
  }
}
