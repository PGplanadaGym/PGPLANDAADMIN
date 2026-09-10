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

  private async validarValores(
    empresaId: string,
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
        case 'fecha':
          if (typeof valor !== 'string' || Number.isNaN(Date.parse(valor))) {
            throw new BadRequestException(
              `El campo "${campo.etiqueta}" debe ser una fecha válida`,
            );
          }
          break;
        case 'relacion': {
          const existe = await this.existeRelacion(empresaId, campo.relacionCon, String(valor));
          if (!existe) {
            throw new BadRequestException(
              `El campo "${campo.etiqueta}" hace referencia a un registro que no existe`,
            );
          }
          break;
        }
        default:
          break;
      }
    }
  }

  private async existeRelacion(
    empresaId: string,
    relacionCon: string | null,
    valorId: string,
  ): Promise<boolean> {
    if (!relacionCon) return false;

    if (relacionCon === 'cliente') {
      const cliente = await this.prisma.cliente.findFirst({
        where: { id: valorId, empresaId },
      });
      return cliente != null;
    }

    if (relacionCon.startsWith('entidad:')) {
      const claveDestino = relacionCon.slice('entidad:'.length);
      const entidadDestino = await this.prisma.entidadDinamica.findUnique({
        where: { empresaId_clave: { empresaId, clave: claveDestino } },
      });
      if (!entidadDestino) return false;

      const registro = await this.prisma.registroDinamico.findFirst({
        where: { id: valorId, entidadId: entidadDestino.id },
      });
      return registro != null;
    }

    return false;
  }

  /** Para campos "relacion", resuelve el id guardado a un texto legible (nombre del cliente o
   * primer campo del registro relacionado) para mostrar en vez del id crudo. */
  private async resolverEtiquetas(
    empresaId: string,
    campos: CampoDinamico[],
    registros: { id: string; valores: Prisma.JsonValue }[],
  ): Promise<Record<string, Record<string, string>>> {
    const camposRelacion = campos.filter((c) => c.tipo === 'relacion' && c.relacionCon);
    if (camposRelacion.length === 0) return {};

    const resultado: Record<string, Record<string, string>> = {};
    for (const registro of registros) resultado[registro.id] = {};

    for (const campo of camposRelacion) {
      const idsUsados = new Set<string>();
      for (const registro of registros) {
        const valores = registro.valores as Record<string, unknown>;
        const valor = valores[campo.clave];
        if (typeof valor === 'string' && valor) idsUsados.add(valor);
      }
      if (idsUsados.size === 0) continue;

      const etiquetaPorId = new Map<string, string>();

      if (campo.relacionCon === 'cliente') {
        const clientes = await this.prisma.cliente.findMany({
          where: { id: { in: [...idsUsados] }, empresaId },
          select: { id: true, nombre: true },
        });
        for (const cliente of clientes) etiquetaPorId.set(cliente.id, cliente.nombre);
      } else if (campo.relacionCon?.startsWith('entidad:')) {
        const claveDestino = campo.relacionCon.slice('entidad:'.length);
        const entidadDestino = await this.prisma.entidadDinamica.findUnique({
          where: { empresaId_clave: { empresaId, clave: claveDestino } },
          include: { campos: { orderBy: { orden: 'asc' }, take: 1 } },
        });
        const primerCampo = entidadDestino?.campos[0]?.clave;
        if (entidadDestino && primerCampo) {
          const relacionados = await this.prisma.registroDinamico.findMany({
            where: { id: { in: [...idsUsados] }, entidadId: entidadDestino.id },
          });
          for (const rel of relacionados) {
            const valores = rel.valores as Record<string, unknown>;
            etiquetaPorId.set(rel.id, String(valores[primerCampo] ?? rel.id));
          }
        }
      }

      for (const registro of registros) {
        const valores = registro.valores as Record<string, unknown>;
        const valor = valores[campo.clave];
        if (typeof valor === 'string' && etiquetaPorId.has(valor)) {
          resultado[registro.id][campo.clave] = etiquetaPorId.get(valor)!;
        }
      }
    }

    return resultado;
  }

  async findAll(empresaId: string, entidadClave: string) {
    const entidad = await this.getEntidad(empresaId, entidadClave);
    const registros = await this.prisma.registroDinamico.findMany({
      where: { entidadId: entidad.id },
      orderBy: { creadoEn: 'desc' },
    });
    const etiquetas = await this.resolverEtiquetas(empresaId, entidad.campos, registros);
    return registros.map((r) => ({ ...r, etiquetas: etiquetas[r.id] ?? {} }));
  }

  async findOne(empresaId: string, entidadClave: string, id: string) {
    const entidad = await this.getEntidad(empresaId, entidadClave);
    const registro = await this.prisma.registroDinamico.findFirst({
      where: { id, entidadId: entidad.id },
    });

    if (!registro) {
      throw new NotFoundException('Registro no encontrado');
    }

    const etiquetas = await this.resolverEtiquetas(empresaId, entidad.campos, [registro]);
    return { ...registro, etiquetas: etiquetas[registro.id] ?? {} };
  }

  async create(
    empresaId: string,
    actorId: string,
    entidadClave: string,
    valores: Record<string, unknown>,
  ) {
    const entidad = await this.getEntidad(empresaId, entidadClave);
    await this.validarValores(empresaId, entidad.campos, valores);

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
    await this.validarValores(empresaId, entidad.campos, valores);

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
