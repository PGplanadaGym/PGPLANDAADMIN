import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';

const INCLUDE_SUCURSAL = {
  encargado: { select: { id: true, nombre: true } },
  _count: { select: { usuarios: true, recursos: true, activos: true } },
} as const;

@Injectable()
export class SucursalesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(empresaId: string, incluirInactivas = false) {
    return this.prisma.sucursal.findMany({
      where: { empresaId, ...(incluirInactivas ? {} : { activa: true }) },
      include: INCLUDE_SUCURSAL,
      orderBy: { nombre: 'asc' },
    });
  }

  private async validarEncargado(empresaId: string, encargadoId?: string) {
    if (!encargadoId) return;
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: encargadoId, empresaId },
    });
    if (!usuario) {
      throw new BadRequestException('El encargado seleccionado no pertenece a tu empresa');
    }
  }

  async create(empresaId: string, dto: CreateSucursalDto) {
    await this.validarEncargado(empresaId, dto.encargadoId);

    return this.prisma.sucursal.create({
      data: { empresaId, ...dto, encargadoId: dto.encargadoId || undefined },
      include: INCLUDE_SUCURSAL,
    });
  }

  async update(empresaId: string, id: string, dto: UpdateSucursalDto) {
    const existente = await this.prisma.sucursal.findFirst({
      where: { id, empresaId },
    });
    if (!existente) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    await this.validarEncargado(empresaId, dto.encargadoId);

    return this.prisma.sucursal.update({
      where: { id },
      data: { ...dto, encargadoId: dto.encargadoId === '' ? null : dto.encargadoId },
      include: INCLUDE_SUCURSAL,
    });
  }

  async findPerfilSucursal(empresaId: string, id: string) {
    const sucursal = await this.prisma.sucursal.findFirst({
      where: { id, empresaId },
      include: INCLUDE_SUCURSAL,
    });
    if (!sucursal) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    const [usuarios, recursos, activos] = await Promise.all([
      this.prisma.usuario.findMany({
        where: { empresaId, sucursalId: id },
        select: { id: true, nombre: true, email: true, cargo: true, activo: true },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.recurso.findMany({
        where: { empresaId, sucursalId: id },
        select: { id: true, nombre: true, tipo: true, activo: true },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.activo.findMany({
        where: { empresaId, sucursalId: id },
        select: { id: true, nombre: true, estado: true, categoriaActivo: { select: { nombre: true } } },
        orderBy: { nombre: 'asc' },
      }),
    ]);

    return { sucursal, usuarios, recursos, activos };
  }

  async remove(empresaId: string, id: string) {
    const sucursal = await this.prisma.sucursal.findFirst({
      where: { id, empresaId },
      include: INCLUDE_SUCURSAL,
    });
    if (!sucursal) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    // Solo se puede eliminar una sucursal que nunca se usó — si tiene empleados, recursos o
    // activos asignados, la vía correcta es desactivarla, no perder esa asociación.
    if (sucursal._count.usuarios > 0 || sucursal._count.recursos > 0 || sucursal._count.activos > 0) {
      throw new ConflictException(
        'Esta sucursal tiene empleados, recursos o activos asignados y no se puede eliminar. Desactívala en su lugar.',
      );
    }

    await this.prisma.sucursal.delete({ where: { id } });
  }
}
