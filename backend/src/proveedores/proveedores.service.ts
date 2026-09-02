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
    include: { producto: { select: { id: true, nombre: true, sku: true } } },
  },
};

@Injectable()
export class ProveedoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  findAllProveedores(empresaId: string) {
    return this.prisma.proveedor.findMany({
      where: { empresaId, activo: true },
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

  findAllOrdenesCompra(empresaId: string) {
    return this.prisma.ordenCompra.findMany({
      where: { empresaId },
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
    if (orden.estado !== 'pendiente') {
      throw new ConflictException('Esta orden de compra ya fue procesada');
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

    const fechaRecepcion = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.ordenCompra.update({
        where: { id },
        data: { estado: 'recibida', fechaRecepcion },
      });

      for (const item of orden.items) {
        const producto = await tx.productoServicio.findUnique({
          where: { id: item.productoId },
        });
        if (!producto || producto.tipo !== 'producto') continue;

        await tx.movimientoStock.create({
          data: {
            empresaId,
            productoId: item.productoId,
            tipo: 'entrada',
            cantidad: item.cantidad,
            motivo: `Compra a ${orden.proveedor.nombre}`,
            usuarioId: actorId,
          },
        });
        await tx.productoServicio.update({
          where: { id: item.productoId },
          data: { stock: (producto.stock ?? 0) + item.cantidad },
        });
      }

      if (categoriaEgreso) {
        await tx.movimientoCuenta.create({
          data: {
            empresaId,
            tipo: 'egreso',
            categoriaId: categoriaEgreso.id,
            monto: orden.total,
            fecha: fechaRecepcion,
            descripcion: `Compra a ${orden.proveedor.nombre}`,
            usuarioId: actorId,
            ordenCompraId: id,
          },
        });
      }
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'orden-compra',
      entidadId: id,
      detalle: { recibida: true },
    });

    return this.findOneOrdenCompra(empresaId, id);
  }

  async removeOrdenCompra(empresaId: string, actorId: string, id: string) {
    const orden = await this.findOneOrdenCompra(empresaId, id);

    await this.prisma.$transaction(async (tx) => {
      if (orden.estado === 'recibida') {
        for (const item of orden.items) {
          const producto = await tx.productoServicio.findUnique({
            where: { id: item.productoId },
          });
          if (!producto || producto.tipo !== 'producto') continue;

          await tx.movimientoStock.create({
            data: {
              empresaId,
              productoId: item.productoId,
              tipo: 'salida',
              cantidad: -item.cantidad,
              motivo: 'Reversión por eliminación de orden de compra',
              usuarioId: actorId,
            },
          });
          await tx.productoServicio.update({
            where: { id: item.productoId },
            data: { stock: (producto.stock ?? 0) - item.cantidad },
          });
        }
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
