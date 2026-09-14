import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PLANTILLAS_NEGOCIO } from './plantillas-negocio';

// Módulos cuyas páginas dependen de datos de otro módulo para funcionar
// (ej. Ventas y Compras leen el catálogo de Inventario). Si el módulo del que
// dependen está inactivo, esas páginas fallan al cargar productos.
const DEPENDENCIAS: Record<string, string[]> = {
  ventas: ['inventario'],
  compras: ['inventario'],
};

function calcularDependientes(clave: string): string[] {
  return Object.entries(DEPENDENCIAS)
    .filter(([, deps]) => deps.includes(clave))
    .map(([dependiente]) => dependiente);
}

const CONTEO_POR_MODULO: Record<
  string,
  (prisma: PrismaService, empresaId: string) => Promise<number>
> = {
  clientes: (prisma, empresaId) => prisma.cliente.count({ where: { empresaId } }),
  citas: (prisma, empresaId) => prisma.cita.count({ where: { empresaId } }),
  inventario: async (prisma, empresaId) => {
    const [activos, productos] = await Promise.all([
      prisma.activo.count({ where: { empresaId } }),
      prisma.productoServicio.count({ where: { empresaId } }),
    ]);
    return activos + productos;
  },
  asistencia: (prisma, empresaId) => prisma.marcacion.count({ where: { empresaId } }),
  cuentas: (prisma, empresaId) => prisma.movimientoCuenta.count({ where: { empresaId } }),
  costeo: (prisma, empresaId) => prisma.costeoProyecto.count({ where: { empresaId } }),
  ventas: (prisma, empresaId) => prisma.orden.count({ where: { empresaId } }),
  compras: (prisma, empresaId) => prisma.ordenCompra.count({ where: { empresaId } }),
  sucursales: (prisma, empresaId) => prisma.sucursal.count({ where: { empresaId } }),
  nomina: (prisma, empresaId) => prisma.pagoNomina.count({ where: { empresaId } }),
};

@Injectable()
export class ModulosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findEstadoPorEmpresa(empresaId: string) {
    const [catalogo, activaciones] = await Promise.all([
      this.prisma.modulo.findMany(),
      this.prisma.empresaModulo.findMany({ where: { empresaId } }),
    ]);

    const activoPorModuloId = new Map(
      activaciones.map((activacion) => [activacion.moduloId, activacion.activo]),
    );

    return catalogo.map((modulo) => ({
      ...modulo,
      activo: activoPorModuloId.get(modulo.id) ?? false,
    }));
  }

  async findDetallePorEmpresa(empresaId: string) {
    const estado = await this.findEstadoPorEmpresa(empresaId);

    return Promise.all(
      estado.map(async (modulo) => ({
        ...modulo,
        usoCount: (await CONTEO_POR_MODULO[modulo.clave]?.(this.prisma, empresaId)) ?? 0,
        dependeDe: DEPENDENCIAS[modulo.clave] ?? [],
        requeridoPor: calcularDependientes(modulo.clave),
      })),
    );
  }

  listarPlantillas() {
    return PLANTILLAS_NEGOCIO;
  }

  async aplicarPlantilla(empresaId: string, actorId: string, clavePlantilla: string) {
    const plantilla = PLANTILLAS_NEGOCIO.find((p) => p.clave === clavePlantilla);
    if (!plantilla) {
      throw new NotFoundException('Plantilla no encontrada');
    }

    const activados: string[] = [];
    for (const claveModulo of plantilla.modulos) {
      const resultado = await this.setActivo(empresaId, actorId, claveModulo, true);
      if (!resultado.yaEstabaActivo) activados.push(resultado.nombre);
      activados.push(...resultado.dependenciasActivadas);
    }

    return { plantilla: plantilla.nombre, activados: [...new Set(activados)] };
  }

  async setActivo(empresaId: string, actorId: string, clave: string, activo: boolean) {
    const modulo = await this.prisma.modulo.findUnique({ where: { clave } });

    if (!modulo) {
      throw new NotFoundException('Módulo no encontrado');
    }

    if (!activo) {
      const dependientesActivos = await this.buscarDependientesActivos(empresaId, clave);
      if (dependientesActivos.length > 0) {
        throw new ConflictException(
          `No puedes desactivar "${modulo.nombre}" mientras ${dependientesActivos
            .map((m) => `"${m.nombre}"`)
            .join(' y ')} ${dependientesActivos.length === 1 ? 'esté activo' : 'estén activos'}. Desactíva${
            dependientesActivos.length === 1 ? 'lo' : 'los'
          } primero.`,
        );
      }
    }

    const activacionPrevia = await this.prisma.empresaModulo.findUnique({
      where: { empresaId_moduloId: { empresaId, moduloId: modulo.id } },
    });
    const yaEstabaActivo = activacionPrevia?.activo === activo;

    await this.prisma.empresaModulo.upsert({
      where: { empresaId_moduloId: { empresaId, moduloId: modulo.id } },
      update: { activo },
      create: { empresaId, moduloId: modulo.id, activo },
    });

    if (!yaEstabaActivo) {
      await this.auditoriaService.registrar({
        empresaId,
        usuarioId: actorId,
        accion: activo ? 'activar' : 'desactivar',
        entidad: 'modulo',
        entidadId: modulo.id,
        detalle: { clave: modulo.clave, nombre: modulo.nombre },
      });
    }

    const dependenciasActivadas: string[] = [];
    if (activo) {
      for (const claveDep of DEPENDENCIAS[clave] ?? []) {
        const activada = await this.activarDependenciaSiHaceFalta(empresaId, actorId, claveDep, clave);
        if (activada) dependenciasActivadas.push(activada);
      }
    }

    return { ...modulo, activo, yaEstabaActivo, dependenciasActivadas };
  }

  private async buscarDependientesActivos(empresaId: string, clave: string) {
    const dependientes = calcularDependientes(clave);
    if (dependientes.length === 0) return [];

    const activaciones = await this.prisma.empresaModulo.findMany({
      where: {
        empresaId,
        activo: true,
        modulo: { clave: { in: dependientes } },
      },
      include: { modulo: true },
    });

    return activaciones.map((a) => a.modulo);
  }

  private async activarDependenciaSiHaceFalta(
    empresaId: string,
    actorId: string,
    claveDep: string,
    claveOrigen: string,
  ) {
    const moduloDep = await this.prisma.modulo.findUnique({ where: { clave: claveDep } });
    if (!moduloDep) return null;

    const activacion = await this.prisma.empresaModulo.findUnique({
      where: { empresaId_moduloId: { empresaId, moduloId: moduloDep.id } },
    });
    if (activacion?.activo) return null;

    await this.prisma.empresaModulo.upsert({
      where: { empresaId_moduloId: { empresaId, moduloId: moduloDep.id } },
      update: { activo: true },
      create: { empresaId, moduloId: moduloDep.id, activo: true },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'activar',
      entidad: 'modulo',
      entidadId: moduloDep.id,
      detalle: {
        clave: moduloDep.clave,
        nombre: moduloDep.nombre,
        motivo: `dependencia automática de "${claveOrigen}"`,
      },
    });

    return moduloDep.nombre;
  }
}
