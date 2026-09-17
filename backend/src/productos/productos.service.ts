import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { CreateCategoriaProductoDto } from './dto/create-categoria-producto.dto';
import { UpdateCategoriaProductoDto } from './dto/update-categoria-producto.dto';

const INCLUDE_PRODUCTO = {
  categoria: { select: { id: true, nombre: true } },
};

@Injectable()
export class ProductosService {
  constructor(
    private readonly prisma: PrismaService,
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

  findAll(empresaId: string, incluirInactivos = false) {
    return this.prisma.productoServicio.findMany({
      where: { empresaId, ...(incluirInactivos ? {} : { activo: true }) },
      include: INCLUDE_PRODUCTO,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const producto = await this.prisma.productoServicio.findFirst({
      where: { id, empresaId },
      include: INCLUDE_PRODUCTO,
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    return producto;
  }

  async create(empresaId: string, actorId: string, dto: CreateProductoDto) {
    if (dto.categoriaId) {
      const categoria = await this.prisma.categoriaProducto.findFirst({
        where: { id: dto.categoriaId, empresaId },
      });
      if (!categoria) {
        throw new NotFoundException('Categoría no encontrada');
      }
    }

    const tipo = dto.tipo ?? 'producto';

    const producto = await this.prisma.productoServicio.create({
      data: {
        empresaId,
        categoriaId: dto.categoriaId,
        tipo,
        nombre: dto.nombre,
        sku: dto.sku,
        precio: dto.precio,
        costo: dto.costo,
        unidadMedida: dto.unidadMedida ?? 'unidad',
        stockMinimo: tipo === 'producto' ? dto.stockMinimo : undefined,
        stock: tipo === 'producto' ? 0 : null,
        imagenUrl: dto.imagenUrl,
      },
      include: INCLUDE_PRODUCTO,
    });

    return producto;
  }

  async update(empresaId: string, actorId: string, id: string, dto: UpdateProductoDto) {
    await this.findOne(empresaId, id);

    if (dto.categoriaId) {
      const categoria = await this.prisma.categoriaProducto.findFirst({
        where: { id: dto.categoriaId, empresaId },
      });
      if (!categoria) {
        throw new NotFoundException('Categoría no encontrada');
      }
    }

    const producto = await this.prisma.productoServicio.update({
      where: { id },
      data: { ...dto, categoriaId: dto.categoriaId === '' ? null : dto.categoriaId },
      include: INCLUDE_PRODUCTO,
    });

    // Si al editar se sube el stock mínimo (o el producto ya estaba bajo de stock) puede
    // quedar por debajo del nuevo umbral sin que haya habido ningún movimiento — sin esto,
    // el aviso solo se disparaba en el próximo movimiento, que podía tardar en llegar.
    if (dto.stockMinimo !== undefined && producto.tipo === 'producto') {
      await this.notificarSiStockBajo(empresaId, producto, producto.stock ?? 0);
    }

    return producto;
  }

  findAllCategorias(empresaId: string, incluirInactivos = false) {
    return this.prisma.categoriaProducto.findMany({
      where: { empresaId, ...(incluirInactivos ? {} : { activo: true }) },
      include: { _count: { select: { productos: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  createCategoria(empresaId: string, dto: CreateCategoriaProductoDto) {
    return this.prisma.categoriaProducto.create({
      data: { empresaId, nombre: dto.nombre },
    });
  }

  async updateCategoria(empresaId: string, id: string, dto: UpdateCategoriaProductoDto) {
    const categoria = await this.prisma.categoriaProducto.findFirst({
      where: { id, empresaId },
    });
    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return this.prisma.categoriaProducto.update({ where: { id }, data: dto });
  }

  async removeCategoria(empresaId: string, id: string) {
    const categoria = await this.prisma.categoriaProducto.findFirst({
      where: { id, empresaId },
    });
    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada');
    }

    // Solo se puede eliminar una categoría que nunca se usó (ni siquiera en un producto
    // archivado) — si tiene productos, la vía correcta es archivarla, no perder la agrupación.
    const productosCount = await this.prisma.productoServicio.count({
      where: { categoriaId: id },
    });
    if (productosCount > 0) {
      throw new ConflictException(
        'Esta categoría tiene productos asociados y no se puede eliminar. Archívala en su lugar.',
      );
    }

    await this.prisma.categoriaProducto.delete({ where: { id } });
  }

  findMovimientos(empresaId: string, productoId: string) {
    return this.prisma.movimientoStock.findMany({
      where: { empresaId, productoId },
      include: { usuario: { select: { id: true, nombre: true, email: true } } },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async stockPorSucursal(empresaId: string, productoId: string) {
    await this.findOne(empresaId, productoId);

    const grupos = await this.prisma.movimientoStock.groupBy({
      by: ['sucursalId'],
      where: { empresaId, productoId },
      _sum: { cantidad: true },
    });

    const sucursalIds = grupos
      .map((g) => g.sucursalId)
      .filter((id): id is string => id !== null);
    const sucursales = await this.prisma.sucursal.findMany({
      where: { id: { in: sucursalIds } },
      select: { id: true, nombre: true },
    });
    const nombrePorId = new Map(sucursales.map((s) => [s.id, s.nombre]));

    return grupos.map((g) => ({
      sucursalId: g.sucursalId,
      sucursalNombre: g.sucursalId ? (nombrePorId.get(g.sucursalId) ?? null) : 'Sin sucursal',
      stock: g._sum.cantidad ?? 0,
    }));
  }

  async registrarMovimiento(
    empresaId: string,
    actorId: string,
    productoId: string,
    dto: RegistrarMovimientoDto,
  ) {
    const producto = await this.findOne(empresaId, productoId);
    if (producto.tipo === 'servicio') {
      throw new BadRequestException('Los servicios no manejan stock');
    }
    // "Entrada" suele bastarse con la cantidad (reposición obvia); "salida" y "ajuste" alteran
    // el stock sin venir de una venta, así que exigimos dejar constancia de por qué.
    if (dto.tipo !== 'entrada' && !dto.motivo?.trim()) {
      throw new BadRequestException(
        'El motivo es obligatorio para registrar una salida o un ajuste de stock',
      );
    }
    if (dto.sucursalId) {
      const sucursal = await this.prisma.sucursal.findFirst({
        where: { id: dto.sucursalId, empresaId },
      });
      if (!sucursal) {
        throw new BadRequestException('La sucursal seleccionada no pertenece a tu empresa');
      }
    }
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
          sucursalId: dto.sucursalId || null,
        },
      }),
      this.prisma.productoServicio.update({
        where: { id: productoId },
        data: { stock: nuevoStock },
      }),
    ]);

    await this.notificarSiStockBajo(empresaId, producto, nuevoStock);

    return productoActualizado;
  }
}
