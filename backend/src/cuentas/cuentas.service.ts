import { Injectable, NotFoundException } from '@nestjs/common';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoriaMovimientoDto } from './dto/create-categoria-movimiento.dto';
import { CreateMovimientoCuentaDto } from './dto/create-movimiento-cuenta.dto';
import { UpdateMovimientoCuentaDto } from './dto/update-movimiento-cuenta.dto';

const SELECT_USUARIO_BASICO = { id: true, nombre: true, email: true } as const;

@Injectable()
export class CuentasService {
  constructor(private readonly prisma: PrismaService) {}

  findAllCategorias(empresaId: string, tipo?: string) {
    return this.prisma.categoriaMovimiento.findMany({
      where: { empresaId, activo: true, ...(tipo ? { tipo } : {}) },
      orderBy: { nombre: 'asc' },
    });
  }

  createCategoria(empresaId: string, dto: CreateCategoriaMovimientoDto) {
    return this.prisma.categoriaMovimiento.create({
      data: { empresaId, tipo: dto.tipo, nombre: dto.nombre },
    });
  }

  findAllMovimientos(
    empresaId: string,
    filtros: { tipo?: string; categoriaId?: string; desde?: string; hasta?: string },
  ) {
    return this.prisma.movimientoCuenta.findMany({
      where: {
        empresaId,
        ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
        ...(filtros.categoriaId ? { categoriaId: filtros.categoriaId } : {}),
        ...(filtros.desde || filtros.hasta
          ? {
              fecha: {
                ...(filtros.desde ? { gte: new Date(filtros.desde) } : {}),
                ...(filtros.hasta ? { lte: new Date(filtros.hasta) } : {}),
              },
            }
          : {}),
      },
      include: {
        categoria: true,
        cliente: { select: { id: true, nombre: true } },
        usuario: { select: SELECT_USUARIO_BASICO },
      },
      orderBy: { fecha: 'desc' },
      take: 500,
    });
  }

  async findOneMovimiento(empresaId: string, id: string) {
    const movimiento = await this.prisma.movimientoCuenta.findFirst({
      where: { id, empresaId },
      include: {
        categoria: true,
        cliente: { select: { id: true, nombre: true } },
        usuario: { select: SELECT_USUARIO_BASICO },
      },
    });
    if (!movimiento) {
      throw new NotFoundException('Movimiento no encontrado');
    }
    return movimiento;
  }

  async createMovimiento(empresaId: string, actorId: string, dto: CreateMovimientoCuentaDto) {
    const categoria = await this.prisma.categoriaMovimiento.findFirst({
      where: { id: dto.categoriaId, empresaId },
    });
    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada');
    }

    const movimiento = await this.prisma.movimientoCuenta.create({
      data: {
        empresaId,
        tipo: dto.tipo,
        categoriaId: dto.categoriaId,
        monto: dto.monto,
        fecha: new Date(dto.fecha),
        descripcion: dto.descripcion,
        metodoPago: dto.metodoPago,
        numeroComprobante: dto.numeroComprobante,
        comprobanteUrl: dto.comprobanteUrl,
        clienteId: dto.clienteId,
        usuarioId: actorId,
      },
      include: {
        categoria: true,
        cliente: { select: { id: true, nombre: true } },
        usuario: { select: SELECT_USUARIO_BASICO },
      },
    });

    return movimiento;
  }

  async updateMovimiento(
    empresaId: string,
    actorId: string,
    id: string,
    dto: UpdateMovimientoCuentaDto,
  ) {
    const existente = await this.findOneMovimiento(empresaId, id);

    if (dto.categoriaId && dto.categoriaId !== existente.categoriaId) {
      const categoria = await this.prisma.categoriaMovimiento.findFirst({
        where: { id: dto.categoriaId, empresaId },
      });
      if (!categoria) {
        throw new NotFoundException('Categoría no encontrada');
      }
    }

    const movimiento = await this.prisma.movimientoCuenta.update({
      where: { id },
      data: {
        categoriaId: dto.categoriaId,
        monto: dto.monto,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        descripcion: dto.descripcion,
        metodoPago: dto.metodoPago,
        numeroComprobante: dto.numeroComprobante,
        comprobanteUrl: dto.comprobanteUrl,
        clienteId: dto.clienteId,
      },
      include: {
        categoria: true,
        cliente: { select: { id: true, nombre: true } },
        usuario: { select: SELECT_USUARIO_BASICO },
      },
    });

    return movimiento;
  }

  async removeMovimiento(empresaId: string, actorId: string, id: string) {
    await this.findOneMovimiento(empresaId, id);
    await this.prisma.movimientoCuenta.delete({ where: { id } });

    return { success: true };
  }

  async resumen(empresaId: string, desde?: string, hasta?: string) {
    const rangoHasta = hasta ? new Date(hasta) : endOfMonth(new Date());
    const rangoDesde = desde ? new Date(desde) : startOfMonth(subMonths(rangoHasta, 5));

    const movimientos = await this.prisma.movimientoCuenta.findMany({
      where: { empresaId, fecha: { gte: rangoDesde, lte: rangoHasta } },
      include: { categoria: true },
    });

    let totalIngresos = 0;
    let totalEgresos = 0;
    const porMesMap = new Map<string, { mes: string; ingresos: number; egresos: number }>();
    const porCategoriaMap = new Map<
      string,
      { categoriaId: string; nombre: string; tipo: string; total: number }
    >();

    for (const movimiento of movimientos) {
      const monto = Number(movimiento.monto);
      const claveMes = format(movimiento.fecha, 'yyyy-MM');
      const etiquetaMes = format(movimiento.fecha, 'MMM yyyy', { locale: es });

      if (!porMesMap.has(claveMes)) {
        porMesMap.set(claveMes, { mes: etiquetaMes, ingresos: 0, egresos: 0 });
      }
      const bucketMes = porMesMap.get(claveMes)!;

      const claveCategoria = movimiento.categoriaId;
      if (!porCategoriaMap.has(claveCategoria)) {
        porCategoriaMap.set(claveCategoria, {
          categoriaId: claveCategoria,
          nombre: movimiento.categoria.nombre,
          tipo: movimiento.tipo,
          total: 0,
        });
      }
      const bucketCategoria = porCategoriaMap.get(claveCategoria)!;

      if (movimiento.tipo === 'ingreso') {
        totalIngresos += monto;
        bucketMes.ingresos += monto;
      } else {
        totalEgresos += monto;
        bucketMes.egresos += monto;
      }
      bucketCategoria.total += monto;
    }

    return {
      desde: rangoDesde,
      hasta: rangoHasta,
      totalIngresos,
      totalEgresos,
      balance: totalIngresos - totalEgresos,
      porMes: [...porMesMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v),
      porCategoria: [...porCategoriaMap.values()].sort((a, b) => b.total - a.total),
    };
  }
}
