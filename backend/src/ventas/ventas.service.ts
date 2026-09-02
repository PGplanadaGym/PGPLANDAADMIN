import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { subMonths } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CreateOrdenDto } from './dto/create-orden.dto';

const TOP_PRODUCTOS_LIMITE = 8;

const INCLUDE_ORDEN = {
  cliente: { select: { id: true, nombre: true } },
  usuario: { select: { id: true, nombre: true } },
  items: {
    include: {
      producto: { select: { id: true, nombre: true, sku: true, tipo: true } },
    },
  },
};

@Injectable()
export class VentasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  findAll(empresaId: string) {
    return this.prisma.orden.findMany({
      where: { empresaId },
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

    for (const item of dto.items) {
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

    let categoria: { id: string } | null = null;
    if (dto.categoriaIngresoId) {
      const moduloCuentasActivo = await this.prisma.empresaModulo.findFirst({
        where: { empresaId, activo: true, modulo: { clave: 'cuentas' } },
      });
      if (moduloCuentasActivo) {
        categoria = await this.prisma.categoriaMovimiento.findFirst({
          where: { id: dto.categoriaIngresoId, empresaId, tipo: 'ingreso' },
        });
        if (!categoria) {
          throw new BadRequestException('Categoría de ingreso no encontrada');
        }
      }
    }

    const total = dto.items.reduce((suma, item) => {
      const producto = productoPorId.get(item.productoId)!;
      return suma + Number(producto.precio) * item.cantidad;
    }, 0);

    const ordenId = await this.prisma.$transaction(async (tx) => {
      const orden = await tx.orden.create({
        data: {
          empresaId,
          clienteId: dto.clienteId,
          usuarioId: actorId,
          notas: dto.notas,
          total,
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

        if (producto.tipo === 'producto') {
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

          if (
            producto.stockMinimo != null &&
            nuevoStock <= producto.stockMinimo
          ) {
            await this.notificacionesService.crear({
              empresaId,
              tipo: 'stock_bajo',
              titulo: 'Stock bajo',
              mensaje: `"${producto.nombre}" quedó con ${nuevoStock} unidades (mínimo ${producto.stockMinimo})`,
              enlace: '/productos',
            });
          }
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
            descripcion: `Venta #${orden.id.slice(0, 8)}`,
            clienteId: dto.clienteId,
            usuarioId: actorId,
            ordenId: orden.id,
          },
        });
      }

      return orden.id;
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'crear',
      entidad: 'venta',
      entidadId: ordenId,
      detalle: { total },
    });

    return this.findOne(empresaId, ordenId);
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

      // El ingreso vinculado en Cuentas se borra en cascada (FK ordenId con onDelete: Cascade).
      await tx.orden.delete({ where: { id } });
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'eliminar',
      entidad: 'venta',
      entidadId: id,
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
