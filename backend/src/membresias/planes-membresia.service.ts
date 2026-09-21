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

  /** El nombre ya es único por empresa a nivel de base de datos (evita la condición de carrera
   * de dos peticiones simultáneas), pero se revisa antes también para dar un mensaje claro en
   * vez de que se cuele el error crudo de Postgres como un 500 genérico. */
  private async validarNombreUnico(empresaId: string, nombre: string, ignorarId?: string) {
    const duplicado = await this.prisma.planMembresia.findFirst({
      where: {
        empresaId,
        id: ignorarId ? { not: ignorarId } : undefined,
        nombre: { equals: nombre.trim(), mode: 'insensitive' },
      },
    });
    if (duplicado) {
      throw new ConflictException(`Ya existe un plan llamado "${nombre.trim()}"`);
    }
  }

  async create(empresaId: string, dto: CreatePlanMembresiaDto) {
    await this.validarNombreUnico(empresaId, dto.nombre);

    return this.prisma.planMembresia.create({
      data: {
        empresaId,
        nombre: dto.nombre.trim(),
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

    if (dto.nombre) {
      await this.validarNombreUnico(empresaId, dto.nombre, id);
    }

    return this.prisma.planMembresia.update({
      where: { id },
      data: { ...dto, nombre: dto.nombre?.trim() },
    });
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
