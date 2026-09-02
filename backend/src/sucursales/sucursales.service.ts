import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';

@Injectable()
export class SucursalesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(empresaId: string) {
    return this.prisma.sucursal.findMany({
      where: { empresaId },
      orderBy: { nombre: 'asc' },
    });
  }

  create(empresaId: string, dto: CreateSucursalDto) {
    return this.prisma.sucursal.create({ data: { empresaId, ...dto } });
  }

  async update(empresaId: string, id: string, dto: UpdateSucursalDto) {
    const existente = await this.prisma.sucursal.findFirst({
      where: { id, empresaId },
    });
    if (!existente) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    return this.prisma.sucursal.update({ where: { id }, data: dto });
  }
}
