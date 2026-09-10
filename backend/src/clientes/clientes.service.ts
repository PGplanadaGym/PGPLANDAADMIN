import { Injectable, NotFoundException } from '@nestjs/common';
import type { CosteoProyecto, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

const INCLUDE_CITA = {
  tipoCita: true,
  recurso: { select: { id: true, nombre: true } },
} satisfies Prisma.CitaInclude;

const INCLUDE_ORDEN = {
  items: {
    include: { producto: { select: { id: true, nombre: true } } },
  },
} satisfies Prisma.OrdenInclude;

const INCLUDE_MOVIMIENTO_CUENTA = {
  categoria: true,
} satisfies Prisma.MovimientoCuentaInclude;

const INCLUDE_ASIGNACION_ACTIVO = {
  activo: { select: { id: true, nombre: true } },
} satisfies Prisma.AsignacionActivoInclude;

type CitaConDetalle = Prisma.CitaGetPayload<{ include: typeof INCLUDE_CITA }>;
type OrdenConItems = Prisma.OrdenGetPayload<{ include: typeof INCLUDE_ORDEN }>;
type MovimientoConCategoria = Prisma.MovimientoCuentaGetPayload<{
  include: typeof INCLUDE_MOVIMIENTO_CUENTA;
}>;
type AsignacionConActivo = Prisma.AsignacionActivoGetPayload<{
  include: typeof INCLUDE_ASIGNACION_ACTIVO;
}>;

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  findAll(empresaId: string) {
    return this.prisma.cliente.findMany({ where: { empresaId, activo: true } });
  }

  async findOne(empresaId: string, id: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, empresaId },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return cliente;
  }

  async create(empresaId: string, actorId: string, dto: CreateClienteDto) {
    const cliente = await this.prisma.cliente.create({
      data: {
        empresaId,
        nombre: dto.nombre,
        email: dto.email,
        telefono: dto.telefono,
        notas: dto.notas,
        etiqueta: dto.etiqueta,
        atributosExtra: dto.atributosExtra as Prisma.InputJsonValue | undefined,
      },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'crear',
      entidad: 'cliente',
      entidadId: cliente.id,
      detalle: { nombre: cliente.nombre },
    });

    return cliente;
  }

  /**
   * `permisosVisor` son los permisos de quien hace la petición (no reglas sobre el cliente):
   * cada sección del perfil viene de un módulo distinto (Citas, Ventas, Costeo, Cuentas,
   * Activos), así que solo se incluye si el visor tiene el `.leer` de ese módulo — de lo
   * contrario alguien con solo `clientes.leer` (ej. recepción) vería ventas, costeos y
   * movimientos financieros de cualquier cliente sin tener permiso sobre esos módulos.
   */
  async findPerfil(empresaId: string, id: string, permisosVisor: string[]) {
    const cliente = await this.findOne(empresaId, id);

    const puedeVerCitas = permisosVisor.includes('citas.leer');
    const puedeVerVentas = permisosVisor.includes('ventas.leer');
    const puedeVerCosteos = permisosVisor.includes('costeo.leer');
    const puedeVerCuentas = permisosVisor.includes('cuentas.leer');
    const puedeVerActivos = permisosVisor.includes('activos.leer');

    const [totalCitas, citas, ordenes, costeos, movimientosCuenta, activosAsignados] =
      await Promise.all([
        puedeVerCitas
          ? this.prisma.cita.count({ where: { empresaId, clienteId: id } })
          : Promise.resolve(0),
        puedeVerCitas
          ? this.prisma.cita.findMany({
              where: { empresaId, clienteId: id },
              include: INCLUDE_CITA,
              orderBy: { fechaInicio: 'desc' },
              take: 10,
            })
          : Promise.resolve<CitaConDetalle[]>([]),
        puedeVerVentas
          ? this.prisma.orden.findMany({
              where: { empresaId, clienteId: id },
              include: INCLUDE_ORDEN,
              orderBy: { creadoEn: 'desc' },
              take: 10,
            })
          : Promise.resolve<OrdenConItems[]>([]),
        puedeVerCosteos
          ? this.prisma.costeoProyecto.findMany({
              where: { empresaId, clienteId: id },
              orderBy: { creadoEn: 'desc' },
              take: 10,
            })
          : Promise.resolve<CosteoProyecto[]>([]),
        puedeVerCuentas
          ? this.prisma.movimientoCuenta.findMany({
              where: { empresaId, clienteId: id },
              include: INCLUDE_MOVIMIENTO_CUENTA,
              orderBy: { fecha: 'desc' },
              take: 10,
            })
          : Promise.resolve<MovimientoConCategoria[]>([]),
        puedeVerActivos
          ? this.prisma.asignacionActivo.findMany({
              where: { empresaId, clienteId: id, fechaDevolucion: null },
              include: INCLUDE_ASIGNACION_ACTIVO,
            })
          : Promise.resolve<AsignacionConActivo[]>([]),
      ]);

    const totalGastadoVentas = ordenes.reduce(
      (suma, orden) => suma + Number(orden.total),
      0,
    );
    const totalGastadoCosteos = costeos
      .filter((c) => c.estado === 'vendido' && c.precioVenta != null)
      .reduce((suma, c) => suma + Number(c.precioVenta), 0);

    return {
      cliente,
      citas,
      ordenes,
      costeos,
      movimientosCuenta,
      activosAsignados,
      resumen: {
        totalCitas,
        totalGastado: totalGastadoVentas + totalGastadoCosteos,
        activosEnPosesion: activosAsignados.length,
      },
    };
  }

  async update(empresaId: string, actorId: string, id: string, dto: UpdateClienteDto) {
    await this.findOne(empresaId, id);

    const cliente = await this.prisma.cliente.update({
      where: { id },
      data: {
        ...dto,
        atributosExtra: dto.atributosExtra as Prisma.InputJsonValue | undefined,
      },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'cliente',
      entidadId: cliente.id,
      detalle: {
        camposEditados: Object.entries(dto)
          .filter(([, valor]) => valor !== undefined)
          .map(([clave]) => clave),
      },
    });

    return cliente;
  }
}
