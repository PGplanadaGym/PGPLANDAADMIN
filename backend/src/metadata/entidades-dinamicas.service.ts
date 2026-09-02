import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEntidadDinamicaDto } from './dto/create-entidad-dinamica.dto';

@Injectable()
export class EntidadesDinamicasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(empresaId: string) {
    return this.prisma.entidadDinamica.findMany({
      where: { empresaId },
      include: { campos: { orderBy: { orden: 'asc' } } },
    });
  }

  async findOne(empresaId: string, clave: string) {
    const entidad = await this.prisma.entidadDinamica.findUnique({
      where: { empresaId_clave: { empresaId, clave } },
      include: { campos: { orderBy: { orden: 'asc' } } },
    });

    if (!entidad) {
      throw new NotFoundException(`Entidad "${clave}" no encontrada`);
    }

    return entidad;
  }

  create(empresaId: string, dto: CreateEntidadDinamicaDto) {
    return this.prisma.entidadDinamica.create({
      data: {
        empresaId,
        clave: dto.clave,
        nombre: dto.nombre,
        campos: {
          create: dto.campos.map((campo, index) => ({
            clave: campo.clave,
            etiqueta: campo.etiqueta,
            tipo: campo.tipo,
            requerido: campo.requerido ?? false,
            opciones: campo.opciones,
            orden: campo.orden ?? index,
          })),
        },
      },
      include: { campos: { orderBy: { orden: 'asc' } } },
    });
  }
}
