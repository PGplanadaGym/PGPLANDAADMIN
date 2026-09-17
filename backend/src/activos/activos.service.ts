import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoriaActivoDto } from './dto/create-categoria-activo.dto';
import { UpdateCategoriaActivoDto } from './dto/update-categoria-activo.dto';
import { CreateActivoDto } from './dto/create-activo.dto';
import { UpdateActivoDto } from './dto/update-activo.dto';
import { AsignarActivoDto } from './dto/asignar-activo.dto';
import { AsignarVariosActivosDto } from './dto/asignar-varios-activos.dto';
import { DevolverActivoDto } from './dto/devolver-activo.dto';
import { DevolverTodosActivosDto } from './dto/devolver-todos-activos.dto';
import { ReemplazarActivoDto } from './dto/reemplazar-activo.dto';
import { CreateMantenimientoDto } from './dto/create-mantenimiento.dto';

const SELECT_USUARIO_BASICO = {
  id: true,
  nombre: true,
  email: true,
  fotoUrl: true,
} as const;

const INCLUDE_ACTIVO = {
  categoriaActivo: true,
  sucursal: { select: { id: true, nombre: true } },
  asignaciones: {
    where: { fechaDevolucion: null },
    include: { usuario: { select: SELECT_USUARIO_BASICO }, cliente: true },
    take: 1,
  },
  _count: { select: { asignaciones: true, mantenimientos: true } },
} as const;

type ActivoConIncludes = Prisma.ActivoGetPayload<{ include: typeof INCLUDE_ACTIVO }>;

@Injectable()
export class ActivosService {
  constructor(private readonly prisma: PrismaService) {}

  private lanzarErrorCodigoInternoDuplicado(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Con el driver adapter de pg, el detalle de la violación de constraint viene anidado
      // en driverAdapterError.cause.constraint.fields (con comillas incluidas en cada nombre)
      // en vez del meta.target plano que usa el motor clásico de Prisma — hay que soportar ambos.
      const meta = error.meta as
        | {
            target?: string[];
            driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } };
          }
        | undefined;
      const campos = (meta?.target ?? meta?.driverAdapterError?.cause?.constraint?.fields ?? []).map(
        (campo) => campo.replace(/"/g, ''),
      );
      if (campos.includes('codigoInterno')) {
        throw new ConflictException(
          'Ya existe otro activo con ese código interno en tu empresa',
        );
      }
    }
    throw error;
  }

  findAllCategorias(empresaId: string, incluirInactivos = false) {
    return this.prisma.categoriaActivo.findMany({
      where: { empresaId, ...(incluirInactivos ? {} : { activo: true }) },
      include: { _count: { select: { activos: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  async createCategoria(empresaId: string, dto: CreateCategoriaActivoDto) {
    return this.prisma.categoriaActivo.create({
      data: { empresaId, nombre: dto.nombre },
    });
  }

  async updateCategoria(empresaId: string, id: string, dto: UpdateCategoriaActivoDto) {
    const categoria = await this.prisma.categoriaActivo.findFirst({
      where: { id, empresaId },
    });
    if (!categoria) {
      throw new NotFoundException('Categoría de activo no encontrada');
    }

    return this.prisma.categoriaActivo.update({ where: { id }, data: dto });
  }

  async removeCategoria(empresaId: string, id: string) {
    const categoria = await this.prisma.categoriaActivo.findFirst({
      where: { id, empresaId },
    });
    if (!categoria) {
      throw new NotFoundException('Categoría de activo no encontrada');
    }

    // Igual que con Activo: solo se puede eliminar una categoría que nunca se usó — si tiene
    // activos, la vía correcta es archivarla, no perder la agrupación de sus registros.
    const activosCount = await this.prisma.activo.count({
      where: { categoriaActivoId: id },
    });
    if (activosCount > 0) {
      throw new ConflictException(
        'Esta categoría tiene activos asociados y no se puede eliminar. Archívala en su lugar.',
      );
    }

    await this.prisma.categoriaActivo.delete({ where: { id } });
  }

  findAllActivos(empresaId: string) {
    return this.prisma.activo.findMany({
      where: { empresaId },
      include: INCLUDE_ACTIVO,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOneActivo(empresaId: string, id: string) {
    const activo = await this.prisma.activo.findFirst({
      where: { id, empresaId },
      include: INCLUDE_ACTIVO,
    });

    if (!activo) {
      throw new NotFoundException('Activo no encontrado');
    }

    return activo;
  }

  async createActivo(empresaId: string, actorId: string, dto: CreateActivoDto) {
    const categoria = await this.prisma.categoriaActivo.findFirst({
      where: { id: dto.categoriaActivoId, empresaId },
    });
    if (!categoria) {
      throw new NotFoundException('Categoría de activo no encontrada');
    }

    const activo = await this.prisma.activo
      .create({
        data: {
          empresaId,
          categoriaActivoId: dto.categoriaActivoId,
          nombre: dto.nombre,
          marca: dto.marca,
          modelo: dto.modelo,
          codigoInterno: dto.codigoInterno,
          numeroSerie: dto.numeroSerie,
          valorCompra: dto.valorCompra,
          fechaCompra: dto.fechaCompra ? new Date(dto.fechaCompra) : undefined,
          garantiaHasta: dto.garantiaHasta ? new Date(dto.garantiaHasta) : undefined,
          notas: dto.notas,
          sucursalId: dto.sucursalId,
          imagenUrl: dto.imagenUrl,
        },
        include: INCLUDE_ACTIVO,
      })
      .catch((error) => this.lanzarErrorCodigoInternoDuplicado(error));

    // el gasto de compra se registra solo, junto con el resto de movimientos de Cuentas.
    if (dto.valorCompra) {
      const categoriaEgreso = await this.prisma.categoriaMovimiento.upsert({
        where: {
          empresaId_tipo_nombre: { empresaId, tipo: 'egreso', nombre: 'Compra de activos' },
        },
        update: {},
        create: { empresaId, tipo: 'egreso', nombre: 'Compra de activos' },
      });

      await this.prisma.movimientoCuenta.create({
        data: {
          empresaId,
          tipo: 'egreso',
          categoriaId: categoriaEgreso.id,
          monto: dto.valorCompra,
          fecha: activo.fechaCompra ?? new Date(),
          descripcion: `Compra de activo: ${activo.nombre}`,
          usuarioId: actorId,
          activoId: activo.id,
        },
      });
    }

    return activo;
  }

  async update(empresaId: string, actorId: string, id: string, dto: UpdateActivoDto) {
    const activo = await this.findOneActivo(empresaId, id);

    // "Asignado" no es un estado que se pueda escribir a mano: solo debe resultar de usar
    // la acción Asignar (que sí crea el registro de AsignacionActivo correspondiente). Si se
    // permitiera aquí, un activo podría quedar marcado "asignado" sin ninguna asignación real.
    if (dto.estado === 'asignado') {
      throw new BadRequestException(
        'El estado "asignado" solo se puede establecer usando la acción Asignar',
      );
    }

    if (dto.categoriaActivoId) {
      const categoria = await this.prisma.categoriaActivo.findFirst({
        where: { id: dto.categoriaActivoId, empresaId },
      });
      if (!categoria) {
        throw new NotFoundException('Categoría de activo no encontrada');
      }
    }

    await this.prisma
      .$transaction(async (tx) => {
        // Si el estado cambia a "disponible" o "baja" mientras el activo seguía asignado, se
        // cierra esa asignación — igual que si se hubiera usado el botón Devolver, para que
        // nunca quede un activo marcado como no-asignado con una asignación todavía abierta.
        if (dto.estado && dto.estado !== 'asignado' && activo.asignaciones[0]) {
          await tx.asignacionActivo.update({
            where: { id: activo.asignaciones[0].id },
            data: { fechaDevolucion: new Date() },
          });
        }

        await tx.activo.update({
          where: { id },
          data: {
            ...dto,
            fechaCompra:
              dto.fechaCompra === undefined
                ? undefined
                : dto.fechaCompra
                  ? new Date(dto.fechaCompra)
                  : null,
            garantiaHasta:
              dto.garantiaHasta === undefined
                ? undefined
                : dto.garantiaHasta
                  ? new Date(dto.garantiaHasta)
                  : null,
          },
        });
      })
      .catch((error) => this.lanzarErrorCodigoInternoDuplicado(error));

    return this.findOneActivo(empresaId, id);
  }

  async remove(empresaId: string, actorId: string, id: string) {
    const activo = await this.findOneActivo(empresaId, id);

    // Un activo eliminable es uno que nunca tuvo historial real (creado por error): si tiene
    // asignaciones o mantenimientos, esos registros deben conservarse — la vía correcta es
    // "dar de baja" (estado: baja), no borrar el activo.
    if (activo._count.asignaciones > 0 || activo._count.mantenimientos > 0) {
      throw new ConflictException(
        'Este activo tiene historial de asignaciones o mantenimientos y no se puede eliminar. Usa "Dar de baja" en su lugar.',
      );
    }

    await this.prisma.activo.delete({ where: { id } });
  }

  async findHistorial(empresaId: string, activoId: string) {
    await this.findOneActivo(empresaId, activoId);

    return this.prisma.asignacionActivo.findMany({
      where: { activoId, empresaId },
      include: {
        usuario: { select: SELECT_USUARIO_BASICO },
        cliente: true,
        asignadoPor: { select: SELECT_USUARIO_BASICO },
      },
      orderBy: { fechaAsignacion: 'desc' },
    });
  }

  private async validarDestinoAsignacion(
    empresaId: string,
    dto: { usuarioId?: string; clienteId?: string },
  ): Promise<{ nuevaSucursalId: string | null }> {
    if (!dto.usuarioId && !dto.clienteId) {
      throw new BadRequestException(
        'Debes indicar un usuario o un cliente para asignar el activo',
      );
    }
    if (dto.usuarioId && dto.clienteId) {
      throw new BadRequestException(
        'Solo puede asignarse a un usuario o a un cliente, no ambos',
      );
    }

    // El activo sigue físicamente a quien lo tiene: si se asigna a un empleado, se traslada a
    // la sucursal de ese empleado; si se asigna a un cliente externo, sale de todas las
    // sucursales (no vuelve a tener una hasta que se devuelva y se reasigne o se edite a mano).
    if (dto.usuarioId) {
      const usuario = await this.prisma.usuario.findFirst({
        where: { id: dto.usuarioId, empresaId },
      });
      if (!usuario) {
        throw new BadRequestException('El usuario seleccionado no pertenece a tu empresa');
      }
      return { nuevaSucursalId: usuario.sucursalId };
    }

    const cliente = await this.prisma.cliente.findFirst({
      where: { id: dto.clienteId, empresaId },
    });
    if (!cliente) {
      throw new BadRequestException('El cliente seleccionado no pertenece a tu empresa');
    }
    return { nuevaSucursalId: null };
  }

  private async asignarActivoEnTx(
    tx: Prisma.TransactionClient,
    empresaId: string,
    actorId: string,
    activo: ActivoConIncludes,
    dto: { usuarioId?: string; clienteId?: string; notas?: string },
    nuevaSucursalId: string | null,
  ) {
    if (activo.estado === 'baja') {
      throw new ConflictException(
        `El activo "${activo.nombre}" está dado de baja y no puede asignarse`,
      );
    }

    const asignacionAbierta = activo.asignaciones[0];
    if (asignacionAbierta) {
      await tx.asignacionActivo.update({
        where: { id: asignacionAbierta.id },
        data: { fechaDevolucion: new Date() },
      });
    }

    await tx.asignacionActivo.create({
      data: {
        empresaId,
        activoId: activo.id,
        usuarioId: dto.usuarioId,
        clienteId: dto.clienteId,
        notas: dto.notas,
        asignadoPorId: actorId,
      },
    });

    await tx.activo.update({
      where: { id: activo.id },
      data: { estado: 'asignado', sucursalId: nuevaSucursalId },
    });
  }

  async asignar(
    empresaId: string,
    actorId: string,
    activoId: string,
    dto: AsignarActivoDto,
  ) {
    const { nuevaSucursalId } = await this.validarDestinoAsignacion(empresaId, dto);
    const activo = await this.findOneActivo(empresaId, activoId);

    await this.prisma.$transaction((tx) =>
      this.asignarActivoEnTx(tx, empresaId, actorId, activo, dto, nuevaSucursalId),
    );

    return this.findOneActivo(empresaId, activoId);
  }

  async asignarVarios(empresaId: string, actorId: string, dto: AsignarVariosActivosDto) {
    const { nuevaSucursalId } = await this.validarDestinoAsignacion(empresaId, dto);

    const activos = await this.prisma.activo.findMany({
      where: { id: { in: dto.activoIds }, empresaId },
      include: INCLUDE_ACTIVO,
    });
    if (activos.length !== new Set(dto.activoIds).size) {
      throw new BadRequestException('Uno o más activos seleccionados no pertenecen a tu empresa');
    }

    // Todo o nada: si un solo activo del lote está dado de baja, no se asigna ninguno — así
    // nunca queda un lote a medio asignar que confunda qué le llegó realmente al empleado.
    await this.prisma.$transaction(async (tx) => {
      for (const activo of activos) {
        await this.asignarActivoEnTx(tx, empresaId, actorId, activo, dto, nuevaSucursalId);
      }
    });

    return this.prisma.activo.findMany({
      where: { id: { in: dto.activoIds } },
      include: INCLUDE_ACTIVO,
    });
  }

  async devolver(
    empresaId: string,
    actorId: string,
    activoId: string,
    dto: DevolverActivoDto,
  ) {
    const activo = await this.findOneActivo(empresaId, activoId);
    const asignacionAbierta = activo.asignaciones[0];
    if (!asignacionAbierta) {
      throw new ConflictException(
        'Este activo no tiene una asignación vigente',
      );
    }

    await this.prisma.$transaction([
      this.prisma.asignacionActivo.update({
        where: { id: asignacionAbierta.id },
        data: {
          fechaDevolucion: new Date(),
          notas: dto.notas ?? asignacionAbierta.notas,
        },
      }),
      this.prisma.activo.update({
        where: { id: activoId },
        data: { estado: 'disponible' },
      }),
    ]);

    return this.findOneActivo(empresaId, activoId);
  }

  async devolverTodos(empresaId: string, actorId: string, dto: DevolverTodosActivosDto) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: dto.usuarioId, empresaId },
    });
    if (!usuario) {
      throw new BadRequestException('El usuario seleccionado no pertenece a tu empresa');
    }

    const asignaciones = await this.prisma.asignacionActivo.findMany({
      where: { empresaId, usuarioId: dto.usuarioId, fechaDevolucion: null },
    });
    if (asignaciones.length === 0) {
      throw new ConflictException('Este usuario no tiene activos asignados actualmente');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const asignacion of asignaciones) {
        await tx.asignacionActivo.update({
          where: { id: asignacion.id },
          data: { fechaDevolucion: new Date(), notas: dto.notas ?? asignacion.notas },
        });
        await tx.activo.update({
          where: { id: asignacion.activoId },
          data: { estado: 'disponible' },
        });
      }
    });

    return { cantidad: asignaciones.length };
  }

  async reemplazar(
    empresaId: string,
    actorId: string,
    activoViejoId: string,
    dto: ReemplazarActivoDto,
  ) {
    if (activoViejoId === dto.activoNuevoId) {
      throw new BadRequestException('El activo de reemplazo debe ser distinto al actual');
    }

    const activoViejo = await this.findOneActivo(empresaId, activoViejoId);
    const asignacionAbierta = activoViejo.asignaciones[0];
    if (!asignacionAbierta) {
      throw new ConflictException('Este activo no tiene una asignación vigente para reemplazar');
    }

    const activoNuevo = await this.findOneActivo(empresaId, dto.activoNuevoId);
    if (activoNuevo.estado !== 'disponible') {
      throw new ConflictException('El activo de reemplazo debe estar disponible');
    }

    const estadoFinalViejo = dto.estadoActivoViejo ?? 'disponible';
    const destino = {
      usuarioId: asignacionAbierta.usuario?.id,
      clienteId: asignacionAbierta.cliente?.id,
      notas: dto.motivo,
    };
    const { nuevaSucursalId } = await this.validarDestinoAsignacion(empresaId, destino);

    await this.prisma.$transaction(async (tx) => {
      await tx.asignacionActivo.update({
        where: { id: asignacionAbierta.id },
        data: { fechaDevolucion: new Date(), notas: dto.motivo ?? asignacionAbierta.notas },
      });
      await tx.activo.update({
        where: { id: activoViejoId },
        data: { estado: estadoFinalViejo },
      });

      await this.asignarActivoEnTx(tx, empresaId, actorId, activoNuevo, destino, nuevaSucursalId);
    });

    return {
      activoViejo: await this.findOneActivo(empresaId, activoViejoId),
      activoNuevo: await this.findOneActivo(empresaId, dto.activoNuevoId),
    };
  }

  async findMantenimientos(empresaId: string, activoId: string) {
    await this.findOneActivo(empresaId, activoId);

    return this.prisma.mantenimientoActivo.findMany({
      where: { activoId, empresaId },
      include: { usuario: { select: SELECT_USUARIO_BASICO } },
      orderBy: { fecha: 'desc' },
    });
  }

  async crearMantenimiento(
    empresaId: string,
    actorId: string,
    activoId: string,
    dto: CreateMantenimientoDto,
  ) {
    const activo = await this.findOneActivo(empresaId, activoId);

    let categoriaEgreso: { id: string } | null = null;
    if (dto.categoriaEgresoId && dto.costo) {
      categoriaEgreso = await this.prisma.categoriaMovimiento.findFirst({
        where: { id: dto.categoriaEgresoId, empresaId, tipo: 'egreso' },
      });
      if (!categoriaEgreso) {
        throw new BadRequestException('Categoría de egreso no encontrada');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const mantenimiento = await tx.mantenimientoActivo.create({
        data: {
          empresaId,
          activoId,
          fecha: new Date(dto.fecha),
          descripcion: dto.descripcion,
          costo: dto.costo,
          usuarioId: actorId,
        },
      });

      if (categoriaEgreso) {
        await tx.movimientoCuenta.create({
          data: {
            empresaId,
            tipo: 'egreso',
            categoriaId: categoriaEgreso.id,
            monto: dto.costo!,
            fecha: mantenimiento.fecha,
            descripcion: `Mantenimiento: ${activo.nombre} — ${dto.descripcion}`,
            usuarioId: actorId,
            mantenimientoId: mantenimiento.id,
          },
        });
      }
    });

    return this.findMantenimientos(empresaId, activoId);
  }

  async eliminarMantenimiento(empresaId: string, activoId: string, mantenimientoId: string) {
    await this.findOneActivo(empresaId, activoId);

    const mantenimiento = await this.prisma.mantenimientoActivo.findFirst({
      where: { id: mantenimientoId, activoId },
    });
    if (!mantenimiento) {
      throw new NotFoundException('Registro de mantenimiento no encontrado');
    }

    await this.prisma.mantenimientoActivo.delete({ where: { id: mantenimientoId } });

    return this.findMantenimientos(empresaId, activoId);
  }
}
