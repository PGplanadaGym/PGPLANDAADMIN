import { Injectable } from '@nestjs/common';
import { endOfDay, endOfMonth, startOfDay, startOfMonth } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private async rangos(empresaId: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { zonaHoraria: true },
    });
    const zonaHoraria = empresa?.zonaHoraria ?? 'America/Guayaquil';
    const ahoraZonado = toZonedTime(new Date(), zonaHoraria);

    return {
      hoyInicio: fromZonedTime(startOfDay(ahoraZonado), zonaHoraria),
      hoyFin: fromZonedTime(endOfDay(ahoraZonado), zonaHoraria),
      mesInicio: fromZonedTime(startOfMonth(ahoraZonado), zonaHoraria),
      mesFin: fromZonedTime(endOfMonth(ahoraZonado), zonaHoraria),
    };
  }

  async metricas(empresaId: string) {
    const modulosActivos = await this.prisma.empresaModulo
      .findMany({
        where: { empresaId, activo: true },
        include: { modulo: true },
      })
      .then((rows) => new Set(rows.map((r) => r.modulo.clave)));

    const { hoyInicio, hoyFin, mesInicio, mesFin } =
      await this.rangos(empresaId);
    const metricas: Record<string, number> = {};
    let proximasCitas: Awaited<ReturnType<typeof this.prisma.cita.findMany>> =
      [];

    if (modulosActivos.has('citas')) {
      metricas.citasHoy = await this.prisma.cita.count({
        where: {
          empresaId,
          fechaInicio: { gte: hoyInicio, lte: hoyFin },
          estado: { not: 'cancelada' },
        },
      });

      proximasCitas = await this.prisma.cita.findMany({
        where: {
          empresaId,
          fechaInicio: { gte: new Date() },
          estado: { not: 'cancelada' },
        },
        include: {
          cliente: { select: { id: true, nombre: true } },
          tipoCita: true,
        },
        orderBy: { fechaInicio: 'asc' },
        take: 5,
      });
    }

    if (modulosActivos.has('ventas')) {
      const agregado = await this.prisma.orden.aggregate({
        where: { empresaId, creadoEn: { gte: mesInicio, lte: mesFin } },
        _sum: { total: true },
        _count: true,
      });
      metricas.ventasMesTotal = Number(agregado._sum.total ?? 0);
      metricas.ventasMesCantidad = agregado._count;
    }

    if (modulosActivos.has('inventario')) {
      const productos = await this.prisma.productoServicio.findMany({
        where: { empresaId, tipo: 'producto', stockMinimo: { not: null } },
        select: { stock: true, stockMinimo: true },
      });
      metricas.productosStockBajo = productos.filter(
        (p) => (p.stock ?? 0) <= (p.stockMinimo ?? 0),
      ).length;
    }

    if (modulosActivos.has('asistencia')) {
      const entradas = await this.prisma.marcacion.findMany({
        where: {
          empresaId,
          tipo: 'entrada',
          creadoEn: { gte: hoyInicio, lte: hoyFin },
        },
        distinct: ['usuarioId'],
        select: { usuarioId: true },
      });
      metricas.asistenciaHoy = entradas.length;
    }

    if (modulosActivos.has('cuentas')) {
      const [ingresos, egresos] = await Promise.all([
        this.prisma.movimientoCuenta.aggregate({
          where: {
            empresaId,
            tipo: 'ingreso',
            fecha: { gte: mesInicio, lte: mesFin },
          },
          _sum: { monto: true },
        }),
        this.prisma.movimientoCuenta.aggregate({
          where: {
            empresaId,
            tipo: 'egreso',
            fecha: { gte: mesInicio, lte: mesFin },
          },
          _sum: { monto: true },
        }),
      ]);
      metricas.ingresosMes = Number(ingresos._sum.monto ?? 0);
      metricas.egresosMes = Number(egresos._sum.monto ?? 0);
    }

    return { modulosActivos: [...modulosActivos], metricas, proximasCitas };
  }
}
