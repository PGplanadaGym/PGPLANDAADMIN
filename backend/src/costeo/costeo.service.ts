import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { GuardarCosteoDto, ParteCosteoDto } from './dto/guardar-costeo.dto';
import { VenderCosteoDto } from './dto/vender-costeo.dto';

const INCLUDE_PROYECTO = {
  cliente: { select: { id: true, nombre: true } },
  usuario: { select: { id: true, nombre: true } },
  partes: {
    include: { materiales: { include: { material: true } } },
    orderBy: { orden: 'asc' as const },
  },
  movimientosCuenta: { select: { id: true } },
};

type ProyectoConPartes = Prisma.CosteoProyectoGetPayload<{ include: typeof INCLUDE_PROYECTO }>;

@Injectable()
export class CosteoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  findAllMateriales(empresaId: string) {
    return this.prisma.material.findMany({
      where: { empresaId, activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  createMaterial(empresaId: string, dto: CreateMaterialDto) {
    return this.prisma.material.create({
      data: {
        empresaId,
        nombre: dto.nombre,
        calidad: dto.calidad,
        unidadMedida: dto.unidadMedida,
        precioUnitario: dto.precioUnitario,
      },
    });
  }

  private calcularTotales(proyecto: ProyectoConPartes) {
    let costoMateriales = 0;
    let costoManoObra = 0;

    for (const parte of proyecto.partes) {
      for (const linea of parte.materiales) {
        costoMateriales += Number(linea.cantidad) * Number(linea.precioUnitarioSnapshot);
      }
      costoManoObra += Number(parte.horas) * Number(proyecto.tarifaHora);
    }

    const otrosCostos = Number(proyecto.otrosCostos);
    const costoTotal = costoMateriales + costoManoObra + otrosCostos;
    const precioSugerido = costoTotal * (1 + Number(proyecto.margenPorcentaje) / 100);

    const gananciaReal =
      proyecto.estado === 'vendido' && proyecto.precioVenta != null && proyecto.costoTotalSnapshot != null
        ? Number(proyecto.precioVenta) - Number(proyecto.costoTotalSnapshot)
        : null;

    return { costoMateriales, costoManoObra, otrosCostos, costoTotal, precioSugerido, gananciaReal };
  }

  /**
   * Si alguien borró desde Cuentas el/los movimientos de una venta (en vez de usar
   * "Deshacer venta"), el costeo queda como huérfano: sigue marcado "vendido" pero
   * ya no tiene ningún movimiento real detrás. Se repara solo, volviendo a borrador,
   * para que no quede atascado sin poder editarse ni eliminarse.
   */
  private async repararSiHuerfano(proyecto: ProyectoConPartes): Promise<ProyectoConPartes> {
    if (proyecto.estado !== 'vendido' || proyecto.movimientosCuenta.length > 0) {
      return proyecto;
    }

    return this.prisma.costeoProyecto.update({
      where: { id: proyecto.id },
      data: { estado: 'borrador', precioVenta: null, costoTotalSnapshot: null, fechaVenta: null },
      include: INCLUDE_PROYECTO,
    });
  }

  async findAllProyectos(empresaId: string) {
    const proyectos = await this.prisma.costeoProyecto.findMany({
      where: { empresaId },
      include: INCLUDE_PROYECTO,
      orderBy: { creadoEn: 'desc' },
    });

    const reparados = await Promise.all(proyectos.map((p) => this.repararSiHuerfano(p)));
    return reparados.map((proyecto) => ({ ...proyecto, totales: this.calcularTotales(proyecto) }));
  }

  async findOneProyecto(empresaId: string, id: string) {
    const proyecto = await this.prisma.costeoProyecto.findFirst({
      where: { id, empresaId },
      include: INCLUDE_PROYECTO,
    });

    if (!proyecto) {
      throw new NotFoundException('Proyecto de costeo no encontrado');
    }

    const reparado = await this.repararSiHuerfano(proyecto);
    return { ...reparado, totales: this.calcularTotales(reparado) };
  }

  private async validarMateriales(empresaId: string, partes: ParteCosteoDto[]) {
    const materialIds = new Set(partes.flatMap((p) => p.materiales.map((m) => m.materialId)));
    if (materialIds.size === 0) return;

    const cantidadValida = await this.prisma.material.count({
      where: { id: { in: [...materialIds] }, empresaId },
    });
    if (cantidadValida !== materialIds.size) {
      throw new BadRequestException('Uno o más materiales no pertenecen a tu empresa');
    }
  }

  private async crearPartes(
    tx: Prisma.TransactionClient,
    proyectoId: string,
    partes: ParteCosteoDto[],
  ) {
    for (let i = 0; i < partes.length; i++) {
      const parte = partes[i];
      const parteCreada = await tx.costeoParte.create({
        data: { proyectoId, nombre: parte.nombre, horas: parte.horas, orden: i },
      });

      if (parte.materiales.length > 0) {
        await tx.costeoParteMaterial.createMany({
          data: parte.materiales.map((m) => ({
            parteId: parteCreada.id,
            materialId: m.materialId,
            cantidad: m.cantidad,
            precioUnitarioSnapshot: m.precioUnitarioSnapshot,
          })),
        });
      }
    }
  }

  async createProyecto(empresaId: string, actorId: string, dto: GuardarCosteoDto) {
    await this.validarMateriales(empresaId, dto.partes);

    const proyectoId = await this.prisma.$transaction(async (tx) => {
      const creado = await tx.costeoProyecto.create({
        data: {
          empresaId,
          nombre: dto.nombre,
          clienteId: dto.clienteId,
          tarifaHora: dto.tarifaHora,
          margenPorcentaje: dto.margenPorcentaje ?? 0,
          otrosCostos: dto.otrosCostos ?? 0,
          notas: dto.notas,
          usuarioId: actorId,
        },
      });
      await this.crearPartes(tx, creado.id, dto.partes);
      return creado.id;
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'crear',
      entidad: 'costeo',
      entidadId: proyectoId,
      detalle: { nombre: dto.nombre },
    });

    return this.findOneProyecto(empresaId, proyectoId);
  }

  async updateProyecto(empresaId: string, actorId: string, id: string, dto: GuardarCosteoDto) {
    const existente = await this.findOneProyecto(empresaId, id);
    if (existente.estado === 'vendido') {
      throw new ConflictException('Este costeo ya fue vendido y no se puede modificar');
    }
    await this.validarMateriales(empresaId, dto.partes);

    await this.prisma.$transaction(async (tx) => {
      await tx.costeoProyecto.update({
        where: { id },
        data: {
          nombre: dto.nombre,
          clienteId: dto.clienteId ?? null,
          tarifaHora: dto.tarifaHora,
          margenPorcentaje: dto.margenPorcentaje ?? 0,
          otrosCostos: dto.otrosCostos ?? 0,
          notas: dto.notas,
        },
      });
      await tx.costeoParte.deleteMany({ where: { proyectoId: id } });
      await this.crearPartes(tx, id, dto.partes);
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'costeo',
      entidadId: id,
    });

    return this.findOneProyecto(empresaId, id);
  }

  async vender(empresaId: string, actorId: string, id: string, dto: VenderCosteoDto) {
    const proyecto = await this.findOneProyecto(empresaId, id);
    if (proyecto.estado === 'vendido') {
      throw new ConflictException('Este costeo ya fue marcado como vendido');
    }

    const moduloCuentasActivo = await this.prisma.empresaModulo.findFirst({
      where: { empresaId, activo: true, modulo: { clave: 'cuentas' } },
    });
    if (!moduloCuentasActivo) {
      throw new ConflictException(
        'Activa el módulo "Cuentas" para poder registrar la venta como ingreso',
      );
    }

    const categoria = await this.prisma.categoriaMovimiento.findFirst({
      where: { id: dto.categoriaId, empresaId, tipo: 'ingreso' },
    });
    if (!categoria) {
      throw new BadRequestException('Categoría de ingreso no encontrada');
    }

    // El egreso real (dinero que de verdad salió del bolsillo) es solo materiales +
    // otros costos — la mano de obra no es un movimiento de dinero, así que no se
    // registra como egreso, aunque sí se sigue usando para calcular la ganancia real.
    const montoEgreso = proyecto.totales.costoMateriales + proyecto.totales.otrosCostos;

    let categoriaEgreso: { id: string } | null = null;
    if (montoEgreso > 0) {
      if (!dto.categoriaEgresoId) {
        throw new BadRequestException(
          'Este costeo tiene costos reales en materiales/otros — indica una categoría de egreso',
        );
      }
      categoriaEgreso = await this.prisma.categoriaMovimiento.findFirst({
        where: { id: dto.categoriaEgresoId, empresaId, tipo: 'egreso' },
      });
      if (!categoriaEgreso) {
        throw new BadRequestException('Categoría de egreso no encontrada');
      }
    }

    const fechaVenta = dto.fecha ? new Date(dto.fecha) : new Date();
    const costoTotalSnapshot = proyecto.totales.costoTotal;

    await this.prisma.$transaction([
      this.prisma.costeoProyecto.update({
        where: { id },
        data: {
          estado: 'vendido',
          precioVenta: dto.precioVenta,
          costoTotalSnapshot,
          fechaVenta,
        },
      }),
      this.prisma.movimientoCuenta.create({
        data: {
          empresaId,
          tipo: 'ingreso',
          categoriaId: dto.categoriaId,
          monto: dto.precioVenta,
          fecha: fechaVenta,
          descripcion: `Venta: ${proyecto.nombre}`,
          clienteId: proyecto.clienteId,
          usuarioId: actorId,
          costeoProyectoId: id,
        },
      }),
      ...(categoriaEgreso
        ? [
            this.prisma.movimientoCuenta.create({
              data: {
                empresaId,
                tipo: 'egreso',
                categoriaId: categoriaEgreso.id,
                monto: montoEgreso,
                fecha: fechaVenta,
                descripcion: `Costo de materiales: ${proyecto.nombre}`,
                clienteId: proyecto.clienteId,
                usuarioId: actorId,
                costeoProyectoId: id,
              },
            }),
          ]
        : []),
    ]);

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'costeo',
      entidadId: id,
      detalle: { vendido: true, precioVenta: dto.precioVenta },
    });

    return this.findOneProyecto(empresaId, id);
  }

  async removeProyecto(empresaId: string, actorId: string, id: string) {
    // Se verifica que exista y de paso se auto-repara si quedó huérfano.
    await this.findOneProyecto(empresaId, id);

    // Al eliminar el costeo se borran en cascada (por la base de datos) sus partes,
    // materiales usados, y cualquier ingreso/egreso de Cuentas vinculado a la venta.
    await this.prisma.costeoProyecto.delete({ where: { id } });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'eliminar',
      entidad: 'costeo',
      entidadId: id,
    });

    return { success: true };
  }

  async deshacerVenta(empresaId: string, actorId: string, id: string) {
    const proyecto = await this.findOneProyecto(empresaId, id);
    if (proyecto.estado !== 'vendido') {
      throw new ConflictException('Este costeo no está marcado como vendido');
    }

    await this.prisma.$transaction([
      this.prisma.movimientoCuenta.deleteMany({ where: { costeoProyectoId: id } }),
      this.prisma.costeoProyecto.update({
        where: { id },
        data: { estado: 'borrador', precioVenta: null, costoTotalSnapshot: null, fechaVenta: null },
      }),
    ]);

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'costeo',
      entidadId: id,
      detalle: { ventaDeshecha: true },
    });

    return this.findOneProyecto(empresaId, id);
  }
}
