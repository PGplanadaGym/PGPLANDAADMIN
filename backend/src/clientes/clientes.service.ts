import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MembresiasService } from '../membresias/membresias.service';
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
    private readonly membresiasService: MembresiasService,
  ) {}

  async findAll(empresaId: string, permisosVisor: string[]) {
    const clientes = await this.prisma.cliente.findMany({ where: { empresaId, activo: true } });

    if (!permisosVisor.includes('membresias.leer')) {
      return clientes.map((cliente) => ({ ...cliente, estadoMembresia: null }));
    }

    const estados = await this.membresiasService.findEstadoPorEmpresa(empresaId);
    const estadoPorCliente = new Map(estados.map((e) => [e.cliente.id, e]));

    return clientes.map((cliente) => {
      const fila = estadoPorCliente.get(cliente.id);
      return {
        ...cliente,
        estadoMembresia: fila
          ? { estado: fila.estado, diasRestantes: fila.diasRestantes, plan: fila.membresia?.plan ?? null }
          : null,
      };
    });
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
        fotoUrl: dto.fotoUrl,
        sexo: dto.sexo,
        atributosExtra: dto.atributosExtra as Prisma.InputJsonValue | undefined,
      },
    });

    return cliente;
  }

  /**
   * `permisosVisor` son los permisos de quien hace la petición (no reglas sobre el cliente):
   * cada sección del perfil viene de un módulo distinto (Citas, Ventas, Cuentas, Activos),
   * así que solo se incluye si el visor tiene el `.leer` de ese módulo — de lo contrario
   * alguien con solo `clientes.leer` (ej. recepción) vería ventas y movimientos financieros
   * de cualquier cliente sin tener permiso sobre esos módulos.
   */
  async findPerfil(empresaId: string, id: string, permisosVisor: string[]) {
    const cliente = await this.findOne(empresaId, id);

    const puedeVerCitas = permisosVisor.includes('citas.leer');
    const puedeVerVentas = permisosVisor.includes('ventas.leer');
    const puedeVerCuentas = permisosVisor.includes('cuentas.leer');
    const puedeVerActivos = permisosVisor.includes('activos.leer');
    const puedeVerMembresias = permisosVisor.includes('membresias.leer');

    const [
      totalCitas,
      citas,
      ordenes,
      movimientosCuenta,
      activosAsignados,
      estadoMembresia,
      sumaVentas,
      sumaOtrosIngresos,
    ] = await Promise.all([
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
      puedeVerMembresias
        ? this.membresiasService.estadoDeCliente(empresaId, id)
        : Promise.resolve(null),
      // Suma de TODAS las ventas completadas (no solo las 10 más recientes que se muestran).
      puedeVerVentas
        ? this.prisma.orden.aggregate({
            where: { empresaId, clienteId: id, estado: 'completada' },
            _sum: { total: true },
          })
        : Promise.resolve({ _sum: { total: null } }),
      // Ingresos en Cuentas que NO vienen de una venta (membresías, cobros manuales, etc.) —
      // se excluye `ordenId` para no contar dos veces el mismo dinero de una venta.
      puedeVerCuentas
        ? this.prisma.movimientoCuenta.aggregate({
            where: { empresaId, clienteId: id, tipo: 'ingreso', ordenId: null },
            _sum: { monto: true },
          })
        : Promise.resolve({ _sum: { monto: null } }),
    ]);

    const totalGastado =
      Number(sumaVentas._sum.total ?? 0) + Number(sumaOtrosIngresos._sum.monto ?? 0);

    return {
      cliente,
      citas,
      ordenes,
      movimientosCuenta,
      activosAsignados,
      estadoMembresia,
      resumen: {
        totalCitas,
        totalGastado,
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

    return cliente;
  }
}
