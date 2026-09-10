import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { RecibirOrdenCompraDto } from './dto/recibir-orden-compra.dto';

const INCLUDE_ORDEN_COMPRA = {
  proveedor: { select: { id: true, nombre: true } },
  usuario: { select: { id: true, nombre: true } },
  items: {
    include: { producto: { select: { id: true, nombre: true, sku: true, tipo: true } } },
  },
};

@Injectable()
export class ProveedoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  findAllProveedores(empresaId: string, incluirInactivos = false) {
    return this.prisma.proveedor.findMany({
      where: { empresaId, ...(incluirInactivos ? {} : { activo: true }) },
      orderBy: { nombre: 'asc' },
    });
  }

  createProveedor(empresaId: string, dto: CreateProveedorDto) {
    return this.prisma.proveedor.create({ data: { empresaId, ...dto } });
  }

  async updateProveedor(
    empresaId: string,
    id: string,
    dto: UpdateProveedorDto,
  ) {
    const existente = await this.prisma.proveedor.findFirst({
      where: { id, empresaId },
    });
    if (!existente) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    return this.prisma.proveedor.update({ where: { id }, data: dto });
  }

  async findPerfilProveedor(empresaId: string, id: string) {
    const proveedor = await this.prisma.proveedor.findFirst({
      where: { id, empresaId },
    });
    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    const ordenes = await this.prisma.ordenCompra.findMany({
      where: { empresaId, proveedorId: id },
      include: INCLUDE_ORDEN_COMPRA,
      orderBy: { creadoEn: 'desc' },
    });

    const totalComprado = ordenes
      .filter((o) => o.estado === 'recibida' || o.estado === 'parcial')
      .reduce((suma, o) => suma + Number(o.total), 0);

    return {
      proveedor,
      ordenes,
      totalComprado,
      cantidadOrdenes: ordenes.length,
    };
  }

  findAllOrdenesCompra(empresaId: string, desde?: string, hasta?: string) {
    return this.prisma.ordenCompra.findMany({
      where: {
        empresaId,
        ...(desde || hasta
          ? {
              creadoEn: {
                ...(desde ? { gte: new Date(desde) } : {}),
                ...(hasta ? { lte: new Date(hasta) } : {}),
              },
            }
          : {}),
      },
      include: INCLUDE_ORDEN_COMPRA,
      orderBy: { creadoEn: 'desc' },
    });
  }

  async findOneOrdenCompra(empresaId: string, id: string) {
    const orden = await this.prisma.ordenCompra.findFirst({
      where: { id, empresaId },
      include: INCLUDE_ORDEN_COMPRA,
    });
    if (!orden) {
      throw new NotFoundException('Orden de compra no encontrada');
    }
    return orden;
  }

  async createOrdenCompra(
    empresaId: string,
    actorId: string,
    dto: CreateOrdenCompraDto,
  ) {
    const proveedor = await this.prisma.proveedor.findFirst({
      where: { id: dto.proveedorId, empresaId },
    });
    if (!proveedor) {
      throw new BadRequestException('Proveedor no encontrado');
    }

    const productoIds = [...new Set(dto.items.map((item) => item.productoId))];
    const cantidadValida = await this.prisma.productoServicio.count({
      where: { id: { in: productoIds }, empresaId },
    });
    if (cantidadValida !== productoIds.length) {
      throw new BadRequestException(
        'Uno o más productos no pertenecen a tu empresa',
      );
    }

    const total = dto.items.reduce(
      (suma, item) => suma + item.precioUnit * item.cantidad,
      0,
    );

    const ordenId = await this.prisma.$transaction(async (tx) => {
      const orden = await tx.ordenCompra.create({
        data: {
          empresaId,
          proveedorId: dto.proveedorId,
          usuarioId: actorId,
          notas: dto.notas,
          total,
          fechaEsperada: dto.fechaEsperada ? new Date(dto.fechaEsperada) : undefined,
        },
      });

      await tx.ordenCompraItem.createMany({
        data: dto.items.map((item) => ({
          ordenCompraId: orden.id,
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnit: item.precioUnit,
        })),
      });

      return orden.id;
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'crear',
      entidad: 'orden-compra',
      entidadId: ordenId,
      detalle: { total },
    });

    return this.findOneOrdenCompra(empresaId, ordenId);
  }

  async recibirOrdenCompra(
    empresaId: string,
    actorId: string,
    id: string,
    dto: RecibirOrdenCompraDto,
  ) {
    const orden = await this.findOneOrdenCompra(empresaId, id);
    if (orden.estado === 'recibida' || orden.estado === 'cancelada') {
      throw new ConflictException('Esta orden de compra ya fue procesada');
    }

    // Qué se recibe AHORA de cada item: si no se especifica, se asume "todo lo que falta" de
    // cada uno (comportamiento simple de un solo clic); si se especifica, permite recepción
    // parcial (recibir menos de lo pendiente, para completar después).
    const recepciones = new Map<string, number>();
    if (dto.items && dto.items.length > 0) {
      for (const r of dto.items) {
        const item = orden.items.find((i) => i.id === r.ordenCompraItemId);
        if (!item) {
          throw new BadRequestException('Uno o más items no pertenecen a esta orden');
        }
        const restante = item.cantidad - item.cantidadRecibida;
        if (r.cantidad > restante) {
          throw new BadRequestException(
            `No se puede recibir más de lo pendiente para "${item.producto.nombre}" (quedan ${restante})`,
          );
        }
        if (r.cantidad > 0) {
          recepciones.set(item.id, r.cantidad);
        }
      }
    } else {
      for (const item of orden.items) {
        const restante = item.cantidad - item.cantidadRecibida;
        if (restante > 0) {
          recepciones.set(item.id, restante);
        }
      }
    }

    if (recepciones.size === 0) {
      throw new BadRequestException('No hay nada pendiente de recibir en esta orden');
    }

    let categoriaEgreso: { id: string } | null = null;
    if (dto.categoriaEgresoId) {
      const moduloCuentasActivo = await this.prisma.empresaModulo.findFirst({
        where: { empresaId, activo: true, modulo: { clave: 'cuentas' } },
      });
      if (moduloCuentasActivo) {
        categoriaEgreso = await this.prisma.categoriaMovimiento.findFirst({
          where: { id: dto.categoriaEgresoId, empresaId, tipo: 'egreso' },
        });
        if (!categoriaEgreso) {
          throw new BadRequestException('Categoría de egreso no encontrada');
        }
      }
    }

    const montoRecibidoAhora = [...recepciones.entries()].reduce((suma, [itemId, cantidad]) => {
      const item = orden.items.find((i) => i.id === itemId)!;
      return suma + cantidad * Number(item.precioUnit);
    }, 0);

    const fechaRecepcion = new Date();

    const completa = await this.prisma.$transaction(async (tx) => {
      for (const [itemId, cantidadAhora] of recepciones) {
        const item = orden.items.find((i) => i.id === itemId)!;

        await tx.ordenCompraItem.update({
          where: { id: itemId },
          data: { cantidadRecibida: item.cantidadRecibida + cantidadAhora },
        });

        if (item.producto.tipo === 'producto') {
          const producto = await tx.productoServicio.findUnique({
            where: { id: item.productoId },
          });
          if (producto) {
            await tx.movimientoStock.create({
              data: {
                empresaId,
                productoId: item.productoId,
                tipo: 'entrada',
                cantidad: cantidadAhora,
                motivo: `Compra a ${orden.proveedor.nombre}`,
                usuarioId: actorId,
              },
            });
            await tx.productoServicio.update({
              where: { id: item.productoId },
              data: { stock: (producto.stock ?? 0) + cantidadAhora },
            });
          }
        }
      }

      const itemsActualizados = await tx.ordenCompraItem.findMany({
        where: { ordenCompraId: id },
      });
      const todoCompleto = itemsActualizados.every((i) => i.cantidadRecibida >= i.cantidad);

      await tx.ordenCompra.update({
        where: { id },
        data: {
          estado: todoCompleto ? 'recibida' : 'parcial',
          fechaRecepcion: todoCompleto ? fechaRecepcion : orden.fechaRecepcion,
        },
      });

      if (categoriaEgreso) {
        await tx.movimientoCuenta.create({
          data: {
            empresaId,
            tipo: 'egreso',
            categoriaId: categoriaEgreso.id,
            monto: montoRecibidoAhora,
            fecha: fechaRecepcion,
            descripcion: `Compra a ${orden.proveedor.nombre}${todoCompleto ? '' : ' (recepción parcial)'}`,
            usuarioId: actorId,
            ordenCompraId: id,
          },
        });
      }

      return todoCompleto;
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'orden-compra',
      entidadId: id,
      detalle: { recibidoAhora: montoRecibidoAhora, completa },
    });

    return this.findOneOrdenCompra(empresaId, id);
  }

  async cancelarOrdenCompra(empresaId: string, actorId: string, id: string) {
    const orden = await this.findOneOrdenCompra(empresaId, id);
    if (orden.estado !== 'pendiente') {
      throw new ConflictException(
        'Solo se puede cancelar una orden de compra que todavía está pendiente',
      );
    }

    await this.prisma.ordenCompra.update({
      where: { id },
      data: { estado: 'cancelada' },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'orden-compra',
      entidadId: id,
      detalle: { cancelada: true },
    });

    return this.findOneOrdenCompra(empresaId, id);
  }

  async removeOrdenCompra(empresaId: string, actorId: string, id: string) {
    const orden = await this.findOneOrdenCompra(empresaId, id);

    await this.prisma.$transaction(async (tx) => {
      // Revierte solo lo que realmente se llegó a recibir (puede ser parcial), no la cantidad
      // pedida completa — una orden "parcial" eliminada no debe restar más de lo que sumó.
      for (const item of orden.items) {
        if (item.producto.tipo !== 'producto' || item.cantidadRecibida <= 0) continue;

        const producto = await tx.productoServicio.findUnique({
          where: { id: item.productoId },
        });
        if (!producto) continue;

        await tx.movimientoStock.create({
          data: {
            empresaId,
            productoId: item.productoId,
            tipo: 'salida',
            cantidad: -item.cantidadRecibida,
            motivo: 'Reversión por eliminación de orden de compra',
            usuarioId: actorId,
          },
        });
        await tx.productoServicio.update({
          where: { id: item.productoId },
          data: { stock: (producto.stock ?? 0) - item.cantidadRecibida },
        });
      }

      // El egreso vinculado en Cuentas se borra en cascada (FK ordenCompraId con onDelete: Cascade).
      await tx.ordenCompra.delete({ where: { id } });
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'eliminar',
      entidad: 'orden-compra',
      entidadId: id,
    });

    return { success: true };
  }
}
