import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateEntidadDinamicaDto } from './dto/create-entidad-dinamica.dto';
import { UpdateEntidadDinamicaDto } from './dto/update-entidad-dinamica.dto';

@Injectable()
export class EntidadesDinamicasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

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

  async create(empresaId: string, actorId: string, dto: CreateEntidadDinamicaDto) {
    const entidad = await this.prisma.entidadDinamica.create({
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
            relacionCon: campo.relacionCon,
            orden: campo.orden ?? index,
          })),
        },
      },
      include: { campos: { orderBy: { orden: 'asc' } } },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'crear',
      entidad: 'entidad_dinamica',
      entidadId: entidad.id,
      detalle: { clave: entidad.clave, nombre: entidad.nombre },
    });

    return entidad;
  }

  /**
   * `nombre` se reemplaza directo. `campos` (si viene) se sincroniza contra los existentes por
   * `clave`: los que ya no están en el body se borran, los que coinciden se actualizan, el resto
   * se crea. Nota: si renombras o quitas la `clave` de un campo, los valores ya guardados bajo esa
   * clave en `RegistroDinamico.valores` quedan huérfanos (no se borran, pero dejan de mostrarse).
   */
  async update(
    empresaId: string,
    actorId: string,
    clave: string,
    dto: UpdateEntidadDinamicaDto,
  ) {
    const entidad = await this.prisma.entidadDinamica.findUnique({
      where: { empresaId_clave: { empresaId, clave } },
      include: { campos: true },
    });

    if (!entidad) {
      throw new NotFoundException(`Entidad "${clave}" no encontrada`);
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.nombre !== undefined) {
        await tx.entidadDinamica.update({
          where: { id: entidad.id },
          data: { nombre: dto.nombre },
        });
      }

      if (dto.campos) {
        const existentesPorClave = new Map(entidad.campos.map((c) => [c.clave, c]));
        const clavesNuevas = new Set(dto.campos.map((c) => c.clave));
        const aEliminar = entidad.campos.filter((c) => !clavesNuevas.has(c.clave));

        if (aEliminar.length > 0) {
          await tx.campoDinamico.deleteMany({
            where: { id: { in: aEliminar.map((c) => c.id) } },
          });
        }

        for (const [index, campo] of dto.campos.entries()) {
          const data = {
            etiqueta: campo.etiqueta,
            tipo: campo.tipo,
            requerido: campo.requerido ?? false,
            opciones: campo.opciones,
            relacionCon: campo.relacionCon,
            orden: campo.orden ?? index,
          };
          const existente = existentesPorClave.get(campo.clave);

          if (existente) {
            await tx.campoDinamico.update({ where: { id: existente.id }, data });
          } else {
            await tx.campoDinamico.create({
              data: { ...data, clave: campo.clave, entidadId: entidad.id },
            });
          }
        }
      }
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'entidad_dinamica',
      entidadId: entidad.id,
      detalle: { clave },
    });

    return this.findOne(empresaId, clave);
  }

  async remove(empresaId: string, actorId: string, clave: string) {
    const entidad = await this.prisma.entidadDinamica.findUnique({
      where: { empresaId_clave: { empresaId, clave } },
    });

    if (!entidad) {
      throw new NotFoundException(`Entidad "${clave}" no encontrada`);
    }

    await this.prisma.$transaction([
      this.prisma.registroDinamico.deleteMany({ where: { entidadId: entidad.id } }),
      this.prisma.campoDinamico.deleteMany({ where: { entidadId: entidad.id } }),
      this.prisma.entidadDinamica.delete({ where: { id: entidad.id } }),
    ]);

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'eliminar',
      entidad: 'entidad_dinamica',
      entidadId: entidad.id,
      detalle: { clave, nombre: entidad.nombre },
    });

    return { success: true };
  }
}
