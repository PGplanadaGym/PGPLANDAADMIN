import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreatePagoNominaDto } from './dto/create-pago-nomina.dto';
import { UpdatePagoNominaDto } from './dto/update-pago-nomina.dto';

const INCLUDE_PAGO = {
  empleado: { select: { id: true, nombre: true, email: true, cargo: true } },
  registradoPor: { select: { id: true, nombre: true } },
  movimientosCuenta: {
    select: { id: true, metodoPago: true, numeroComprobante: true },
    take: 1,
  },
};

@Injectable()
export class NominaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  findAll(empresaId: string, periodo?: string) {
    return this.prisma.pagoNomina.findMany({
      where: { empresaId, ...(periodo ? { periodo } : {}) },
      include: INCLUDE_PAGO,
      orderBy: { fechaPago: 'desc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const pago = await this.prisma.pagoNomina.findFirst({
      where: { id, empresaId },
      include: INCLUDE_PAGO,
    });
    if (!pago) {
      throw new NotFoundException('Pago de nómina no encontrado');
    }
    return pago;
  }

  async create(empresaId: string, actorId: string, dto: CreatePagoNominaDto) {
    const empleado = await this.prisma.usuario.findFirst({
      where: { id: dto.empleadoId, empresaId },
    });
    if (!empleado) {
      throw new BadRequestException('Empleado no encontrado');
    }

    const bonos = dto.bonos ?? 0;
    const descuentos = dto.descuentos ?? 0;
    const totalPagado = dto.sueldoBase + bonos - descuentos;
    const fechaPago = dto.fechaPago ? new Date(dto.fechaPago) : new Date();

    let categoria: { id: string } | null = null;
    if (dto.categoriaEgresoId) {
      const moduloCuentasActivo = await this.prisma.empresaModulo.findFirst({
        where: { empresaId, activo: true, modulo: { clave: 'cuentas' } },
      });
      if (moduloCuentasActivo) {
        categoria = await this.prisma.categoriaMovimiento.findFirst({
          where: { id: dto.categoriaEgresoId, empresaId, tipo: 'egreso' },
        });
        if (!categoria) {
          throw new BadRequestException('Categoría de egreso no encontrada');
        }
      }
    }

    const pagoId = await this.prisma.$transaction(async (tx) => {
      const pago = await tx.pagoNomina.create({
        data: {
          empresaId,
          empleadoId: dto.empleadoId,
          periodo: dto.periodo,
          sueldoBase: dto.sueldoBase,
          bonos,
          descuentos,
          totalPagado,
          fechaPago,
          notas: dto.notas,
          registradoPorId: actorId,
        },
      });

      if (categoria) {
        await tx.movimientoCuenta.create({
          data: {
            empresaId,
            tipo: 'egreso',
            categoriaId: categoria.id,
            monto: totalPagado,
            fecha: fechaPago,
            descripcion: `Nómina ${dto.periodo}: ${empleado.nombre}`,
            usuarioId: actorId,
            pagoNominaId: pago.id,
            metodoPago: dto.metodoPago,
            numeroComprobante: dto.numeroComprobante,
            comprobanteUrl: dto.comprobanteUrl,
          },
        });
      }

      return pago.id;
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'crear',
      entidad: 'pago-nomina',
      entidadId: pagoId,
      detalle: {
        empleadoId: dto.empleadoId,
        periodo: dto.periodo,
        totalPagado,
      },
    });

    return this.findOne(empresaId, pagoId);
  }

  async update(empresaId: string, actorId: string, id: string, dto: UpdatePagoNominaDto) {
    const pago = await this.prisma.pagoNomina.findFirst({ where: { id, empresaId } });
    if (!pago) {
      throw new NotFoundException('Pago de nómina no encontrado');
    }

    const sueldoBase = dto.sueldoBase ?? Number(pago.sueldoBase);
    const bonos = dto.bonos ?? Number(pago.bonos);
    const descuentos = dto.descuentos ?? Number(pago.descuentos);
    const totalPagado = sueldoBase + bonos - descuentos;
    const fechaPago = dto.fechaPago ? new Date(dto.fechaPago) : pago.fechaPago;

    await this.prisma.$transaction(async (tx) => {
      await tx.pagoNomina.update({
        where: { id },
        data: {
          sueldoBase,
          bonos,
          descuentos,
          totalPagado,
          fechaPago,
          notas: dto.notas === undefined ? undefined : dto.notas || null,
        },
      });

      // Si este pago tiene un gasto vinculado en Cuentas, se mantiene sincronizado con el
      // nuevo monto y fecha — de lo contrario el gasto quedaría mostrando un valor viejo.
      const movimiento = await tx.movimientoCuenta.findFirst({ where: { pagoNominaId: id } });
      if (movimiento) {
        await tx.movimientoCuenta.update({
          where: { id: movimiento.id },
          data: { monto: totalPagado, fecha: fechaPago },
        });
      }
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'pago-nomina',
      entidadId: id,
      detalle: { totalPagado },
    });

    return this.findOne(empresaId, id);
  }

  async remove(empresaId: string, actorId: string, id: string) {
    await this.findOne(empresaId, id);

    // El egreso vinculado en Cuentas se borra en cascada (FK pagoNominaId con onDelete: Cascade).
    await this.prisma.pagoNomina.delete({ where: { id } });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'eliminar',
      entidad: 'pago-nomina',
      entidadId: id,
    });

    return { success: true };
  }
}
