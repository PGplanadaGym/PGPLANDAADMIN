import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CampoDinamico, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class RegistrosDinamicosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  private async getEntidad(empresaId: string, entidadClave: string) {
    const entidad = await this.prisma.entidadDinamica.findUnique({
      where: { empresaId_clave: { empresaId, clave: entidadClave } },
      include: { campos: true },
    });

    if (!entidad) {
      throw new NotFoundException(`Entidad "${entidadClave}" no encontrada`);
    }

    return entidad;
  }

  private validarValores(
    campos: CampoDinamico[],
    valores: Record<string, unknown>,
  ) {
    for (const campo of campos) {
      const valor = valores[campo.clave];
      const vacio = valor === undefined || valor === null || valor === '';

      if (campo.requerido && vacio) {
        throw new BadRequestException(
          `El campo "${campo.etiqueta}" es requerido`,
        );
      }

      if (vacio) continue;

      switch (campo.tipo) {
        case 'numero':
          if (typeof valor !== 'number') {
            throw new BadRequestException(
              `El campo "${campo.etiqueta}" debe ser numérico`,
            );
          }
          break;
        case 'booleano':
          if (typeof valor !== 'boolean') {
            throw new BadRequestException(
              `El campo "${campo.etiqueta}" debe ser verdadero o falso`,
            );
          }
          break;
        case 'select': {
          const opciones = (campo.opciones as string[] | null) ?? [];
          if (opciones.length > 0 && !opciones.includes(String(valor))) {
            throw new BadRequestException(
              `El campo "${campo.etiqueta}" tiene un valor inválido`,
            );
          }
          break;
        }
        default:
          break;
      }
    }
  }

  async findAll(empresaId: string, entidadClave: string) {
    const entidad = await this.getEntidad(empresaId, entidadClave);
    return this.prisma.registroDinamico.findMany({
      where: { entidadId: entidad.id },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async findOne(empresaId: string, entidadClave: string, id: string) {
    const entidad = await this.getEntidad(empresaId, entidadClave);
    const registro = await this.prisma.registroDinamico.findFirst({
      where: { id, entidadId: entidad.id },
    });

    if (!registro) {
      throw new NotFoundException('Registro no encontrado');
    }

    return registro;
  }

  async create(
    empresaId: string,
    actorId: string,
    entidadClave: string,
    valores: Record<string, unknown>,
  ) {
    const entidad = await this.getEntidad(empresaId, entidadClave);
    this.validarValores(entidad.campos, valores);

    const registro = await this.prisma.registroDinamico.create({
      data: {
        entidadId: entidad.id,
        valores: valores as Prisma.InputJsonValue,
      },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'crear',
      entidad: `entidad_dinamica:${entidadClave}`,
      entidadId: registro.id,
    });

    return registro;
  }

  async update(
    empresaId: string,
    actorId: string,
    entidadClave: string,
    id: string,
    valores: Record<string, unknown>,
  ) {
    const entidad = await this.getEntidad(empresaId, entidadClave);
    await this.findOne(empresaId, entidadClave, id);
    this.validarValores(entidad.campos, valores);

    const registro = await this.prisma.registroDinamico.update({
      where: { id },
      data: { valores: valores as Prisma.InputJsonValue },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: `entidad_dinamica:${entidadClave}`,
      entidadId: registro.id,
    });

    return registro;
  }

  async remove(empresaId: string, actorId: string, entidadClave: string, id: string) {
    await this.findOne(empresaId, entidadClave, id);
    await this.prisma.registroDinamico.delete({ where: { id } });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'eliminar',
      entidad: `entidad_dinamica:${entidadClave}`,
      entidadId: id,
    });

    return { success: true };
  }
}
