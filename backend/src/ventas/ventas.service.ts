import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { subMonths } from 'date-fns';
import type { Prisma, ProductoServicio } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CreateOrdenDto } from './dto/create-orden.dto';
import { ConfirmarOrdenDto } from './dto/confirmar-orden.dto';

interface InfoPago {
  clienteId?: string;
  metodoPago?: string;
  numeroComprobante?: string;
  comprobanteUrl?: string;
}

const TOP_PRODUCTOS_LIMITE = 8;

const INCLUDE_ORDEN = {
  cliente: { select: { id: true, nombre: true } },
  usuario: { select: { id: true, nombre: true } },
  items: {
    include: {
      producto: { select: { id: true, nombre: true, sku: true, tipo: true } },
    },
  },
  movimientosCuenta: {
    select: { metodoPago: true, numeroComprobante: true },
    take: 1,
  },
};

@Injectable()
export class VentasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  findAll(empresaId: string, desde?: string, hasta?: string) {
    return this.prisma.orden.findMany({
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
      include: INCLUDE_ORDEN,
      orderBy: { creadoEn: 'desc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const orden = await this.prisma.orden.findFirst({
      where: { id, empresaId },
      include: INCLUDE_ORDEN,
    });

    if (!orden) {
      throw new NotFoundException('Venta no encontrada');
    }

    return orden;
  }

  private validarStockSuficiente(
    items: { productoId: string; cantidad: number }[],
    productoPorId: Map<string, ProductoServicio>,
  ) {
    for (const item of items) {
      const producto = productoPorId.get(item.productoId)!;
      if (producto.tipo === 'producto') {
        const stockActual = producto.stock ?? 0;
        if (item.cantidad > stockActual) {
          throw new ConflictException(
            `Stock insuficiente para "${producto.nombre}": hay ${stockActual} y se intentan vender ${item.cantidad}`,
          );
        }
      }
    }
  }

  private async resolverCategoriaIngreso(empresaId: string, categoriaIngresoId?: string) {
    if (!categoriaIngresoId) return null;

    const categoria = await this.prisma.categoriaMovimiento.findFirst({
      where: { id: categoriaIngresoId, empresaId, tipo: 'ingreso' },
    });
    if (!categoria) {
      throw new BadRequestException('Categoría de ingreso no encontrada');
    }
    return categoria;
  }

  private async aplicarStockYCategoria(
    tx: Prisma.TransactionClient,
    empresaId: string,
    actorId: string,
    items: { productoId: string; cantidad: number }[],
    productoPorId: Map<string, ProductoServicio>,
    categoria: { id: string } | null,
    pago: InfoPago,
    ordenId: string,
    total: number,
  ) {
    for (const item of items) {
      const producto = productoPorId.get(item.productoId)!;
      if (producto.tipo !== 'producto') continue;

      const nuevoStock = (producto.stock ?? 0) - item.cantidad;
      await tx.movimientoStock.create({
        data: {
          empresaId,
          productoId: item.productoId,
          tipo: 'salida',
          cantidad: -item.cantidad,
          motivo: 'Venta',
          usuarioId: actorId,
        },
      });
      await tx.productoServicio.update({
        where: { id: item.productoId },
        data: { stock: nuevoStock },
      });

      if (producto.stockMinimo != null && nuevoStock <= producto.stockMinimo) {
        await this.notificacionesService.crear({
          empresaId,
          tipo: 'stock_bajo',
          titulo: 'Stock bajo',
          mensaje: `"${producto.nombre}" quedó con ${nuevoStock} unidades (mínimo ${producto.stockMinimo})`,
          enlace: '/productos',
        });
      }
    }

    if (categoria) {
      await tx.movimientoCuenta.create({
        data: {
          empresaId,
          tipo: 'ingreso',
          categoriaId: categoria.id,
          monto: total,
          fecha: new Date(),
          descripcion: `Venta #${ordenId.slice(0, 8)}`,
          clienteId: pago.clienteId,
          usuarioId: actorId,
          ordenId,
          metodoPago: pago.metodoPago,
          numeroComprobante: pago.numeroComprobante,
          comprobanteUrl: pago.comprobanteUrl,
        },
      });
    }
  }

  async create(empresaId: string, actorId: string, dto: CreateOrdenDto) {
    const productoIds = [...new Set(dto.items.map((item) => item.productoId))];
    const productos = await this.prisma.productoServicio.findMany({
      where: { id: { in: productoIds }, empresaId },
    });
    if (productos.length !== productoIds.length) {
      throw new BadRequestException(
        'Uno o más productos no pertenecen a tu empresa',
      );
    }

    const productoPorId = new Map(
      productos.map((producto) => [producto.id, producto]),
    );

    // Una venta "en espera" todavía no compromete stock ni dinero: se guarda tal cual para
    // retomarla después, y toda la validación de stock/ingreso ocurre recién al confirmarla.
    const enEspera = dto.enEspera ?? false;
    if (!enEspera) {
      this.validarStockSuficiente(dto.items, productoPorId);
    }

    const categoria = enEspera
      ? null
      : await this.resolverCategoriaIngreso(empresaId, dto.categoriaIngresoId);

    const subtotal = dto.items.reduce((suma, item) => {
      const producto = productoPorId.get(item.productoId)!;
      return suma + Number(producto.precio) * item.cantidad;
    }, 0);
    const descuento = Math.min(Math.max(dto.descuento ?? 0, 0), subtotal);
    const total = subtotal - descuento;

    const ordenId = await this.prisma.$transaction(async (tx) => {
      const orden = await tx.orden.create({
        data: {
          empresaId,
          clienteId: dto.clienteId,
          usuarioId: actorId,
          notas: dto.notas,
          estado: enEspera ? 'pendiente' : 'completada',
          total,
          descuento,
        },
      });

      for (const item of dto.items) {
        const producto = productoPorId.get(item.productoId)!;
        await tx.ordenItem.create({
          data: {
            ordenId: orden.id,
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnit: producto.precio,
          },
        });
      }

      if (!enEspera) {
        await this.aplicarStockYCategoria(
          tx,
          empresaId,
          actorId,
          dto.items,
          productoPorId,
          categoria,
          {
            clienteId: dto.clienteId,
            metodoPago: dto.metodoPago,
            numeroComprobante: dto.numeroComprobante,
            comprobanteUrl: dto.comprobanteUrl,
          },
          orden.id,
          total,
        );
      }

      return orden.id;
    });

    return this.findOne(empresaId, ordenId);
  }

  async confirmar(empresaId: string, actorId: string, id: string, dto: ConfirmarOrdenDto) {
    const orden = await this.prisma.orden.findFirst({
      where: { id, empresaId },
      include: { items: true },
    });
    if (!orden) {
      throw new NotFoundException('Venta no encontrada');
    }
    if (orden.estado !== 'pendiente') {
      throw new ConflictException('Esta venta ya fue confirmada');
    }

    const productoIds = [...new Set(orden.items.map((item) => item.productoId))];
    const productos = await this.prisma.productoServicio.findMany({
      where: { id: { in: productoIds }, empresaId },
    });
    const productoPorId = new Map(productos.map((producto) => [producto.id, producto]));

    // El stock pudo haber cambiado desde que se dejó la venta en espera — se revalida ahora,
    // que es cuando de verdad se va a descontar.
    this.validarStockSuficiente(orden.items, productoPorId);

    const categoria = await this.resolverCategoriaIngreso(empresaId, dto.categoriaIngresoId);

    await this.prisma.$transaction(async (tx) => {
      await this.aplicarStockYCategoria(
        tx,
        empresaId,
        actorId,
        orden.items,
        productoPorId,
        categoria,
        {
          clienteId: orden.clienteId ?? undefined,
          metodoPago: dto.metodoPago,
          numeroComprobante: dto.numeroComprobante,
          comprobanteUrl: dto.comprobanteUrl,
        },
        orden.id,
        Number(orden.total),
      );

      await tx.orden.update({ where: { id }, data: { estado: 'completada' } });
    });

    return this.findOne(empresaId, id);
  }

  async remove(empresaId: string, actorId: string, id: string) {
    const orden = await this.prisma.orden.findFirst({
      where: { id, empresaId },
      include: { items: { include: { producto: true } } },
    });

    if (!orden) {
      throw new NotFoundException('Venta no encontrada');
    }

    await this.prisma.$transaction(async (tx) => {
      // Una venta "en espera" nunca descontó stock, así que al eliminarla no hay nada que
      // revertir — solo se borra el registro.
      if (orden.estado !== 'pendiente') {
        for (const item of orden.items) {
          if (item.producto.tipo === 'producto') {
            await tx.movimientoStock.create({
              data: {
                empresaId,
                productoId: item.productoId,
                tipo: 'entrada',
                cantidad: item.cantidad,
                motivo: 'Reversión por eliminación de venta',
                usuarioId: actorId,
              },
            });
            await tx.productoServicio.update({
              where: { id: item.productoId },
              data: { stock: (item.producto.stock ?? 0) + item.cantidad },
            });
          }
        }
      }

      // El ingreso vinculado en Cuentas se borra en cascada (FK ordenId con onDelete: Cascade).
      await tx.orden.delete({ where: { id } });
    });

    return { success: true };
  }

  async topProductos(empresaId: string, desde?: string, hasta?: string) {
    const rangoHasta = hasta ? new Date(hasta) : new Date();
    const rangoDesde = desde ? new Date(desde) : subMonths(rangoHasta, 6);

    const items = await this.prisma.ordenItem.findMany({
      where: {
        orden: { empresaId, creadoEn: { gte: rangoDesde, lte: rangoHasta } },
      },
      include: { producto: { select: { id: true, nombre: true } } },
    });

    const porProducto = new Map<
      string,
      {
        productoId: string;
        nombre: string;
        cantidadVendida: number;
        totalVendido: number;
      }
    >();

    for (const item of items) {
      if (!porProducto.has(item.productoId)) {
        porProducto.set(item.productoId, {
          productoId: item.productoId,
          nombre: item.producto.nombre,
          cantidadVendida: 0,
          totalVendido: 0,
        });
      }
      const bucket = porProducto.get(item.productoId)!;
      bucket.cantidadVendida += item.cantidad;
      bucket.totalVendido += item.cantidad * Number(item.precioUnit);
    }

    return [...porProducto.values()]
      .sort((a, b) => b.totalVendido - a.totalVendido)
      .slice(0, TOP_PRODUCTOS_LIMITE);
  }
}
