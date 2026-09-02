import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';

@Injectable()
export class ProductosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  private async notificarSiStockBajo(
    empresaId: string,
    producto: { id: string; nombre: string; stockMinimo: number | null },
    nuevoStock: number,
  ) {
    if (producto.stockMinimo == null || nuevoStock > producto.stockMinimo) return;

    await this.notificacionesService.crear({
      empresaId,
      tipo: 'stock_bajo',
      titulo: 'Stock bajo',
      mensaje: `"${producto.nombre}" quedó con ${nuevoStock} unidades (mínimo ${producto.stockMinimo})`,
      enlace: '/productos',
    });
  }

  findAll(empresaId: string) {
    return this.prisma.productoServicio.findMany({
      where: { empresaId, tipo: 'producto' },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const producto = await this.prisma.productoServicio.findFirst({
      where: { id, empresaId, tipo: 'producto' },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    return producto;
  }

  async create(empresaId: string, actorId: string, dto: CreateProductoDto) {
    const producto = await this.prisma.productoServicio.create({
      data: {
        empresaId,
        tipo: 'producto',
        nombre: dto.nombre,
        sku: dto.sku,
        precio: dto.precio,
        unidadMedida: dto.unidadMedida ?? 'unidad',
        stockMinimo: dto.stockMinimo,
        stock: 0,
      },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'crear',
      entidad: 'producto',
      entidadId: producto.id,
      detalle: { nombre: producto.nombre },
    });

    return producto;
  }

  findMovimientos(empresaId: string, productoId: string) {
    return this.prisma.movimientoStock.findMany({
      where: { empresaId, productoId },
      include: { usuario: { select: { id: true, nombre: true, email: true } } },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async registrarMovimiento(
    empresaId: string,
    actorId: string,
    productoId: string,
    dto: RegistrarMovimientoDto,
  ) {
    const producto = await this.findOne(empresaId, productoId);
    const stockActual = producto.stock ?? 0;

    let delta: number;
    if (dto.tipo === 'entrada') {
      delta = dto.cantidad;
    } else if (dto.tipo === 'salida') {
      if (dto.cantidad > stockActual) {
        throw new ConflictException(
          `Stock insuficiente: hay ${stockActual} y se intentan sacar ${dto.cantidad}`,
        );
      }
      delta = -dto.cantidad;
    } else {
      delta = dto.cantidad - stockActual;
    }

    const nuevoStock = stockActual + delta;

    const [, productoActualizado] = await this.prisma.$transaction([
      this.prisma.movimientoStock.create({
        data: {
          empresaId,
          productoId,
          tipo: dto.tipo,
          cantidad: delta,
          motivo: dto.motivo,
          usuarioId: actorId,
        },
      }),
      this.prisma.productoServicio.update({
        where: { id: productoId },
        data: { stock: nuevoStock },
      }),
    ]);

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'producto',
      entidadId: productoId,
      detalle: { tipo: dto.tipo, cantidad: delta, stockResultante: nuevoStock },
    });

    await this.notificarSiStockBajo(empresaId, producto, nuevoStock);

    return productoActualizado;
  }
}
