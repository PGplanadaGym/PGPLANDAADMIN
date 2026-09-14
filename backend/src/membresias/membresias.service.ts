import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { RenovarMembresiaDto } from './dto/renovar-membresia.dto';
import { EditarVencimientoMembresiaDto } from './dto/editar-vencimiento-membresia.dto';

const UMBRAL_POR_VENCER_DIAS = 7;

type EstadoMembresia = 'activo' | 'por_vencer' | 'vencido' | 'sin_membresia';

function diasEntre(desde: Date, hasta: Date) {
  const inicioDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((inicioDia(hasta).getTime() - inicioDia(desde).getTime()) / 86_400_000);
}

@Injectable()
export class MembresiasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findEstadoPorEmpresa(empresaId: string) {
    const [clientes, membresias] = await Promise.all([
      this.prisma.cliente.findMany({
        where: { empresaId, activo: true },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.membresia.findMany({
        where: { empresaId },
        orderBy: { fechaVencimiento: 'desc' },
        include: { plan: true },
      }),
    ]);

    // la primera vez que aparece cada clienteId (ya viene ordenado por vencimiento desc)
    // es su membresía vigente/más reciente
    const ultimaPorCliente = new Map<string, (typeof membresias)[number]>();
    for (const membresia of membresias) {
      if (!ultimaPorCliente.has(membresia.clienteId)) {
        ultimaPorCliente.set(membresia.clienteId, membresia);
      }
    }

    const hoy = new Date();

    return clientes.map((cliente) => {
      const membresia = ultimaPorCliente.get(cliente.id);

      if (!membresia) {
        return {
          cliente: {
            id: cliente.id,
            nombre: cliente.nombre,
            email: cliente.email,
            fotoUrl: cliente.fotoUrl,
          },
          membresia: null,
          diasRestantes: null,
          estado: 'sin_membresia' satisfies EstadoMembresia,
        };
      }

      const diasRestantes = diasEntre(hoy, membresia.fechaVencimiento);
      const estado: EstadoMembresia =
        diasRestantes < 0 ? 'vencido' : diasRestantes <= UMBRAL_POR_VENCER_DIAS ? 'por_vencer' : 'activo';

      return {
        cliente: {
          id: cliente.id,
          nombre: cliente.nombre,
          email: cliente.email,
          fotoUrl: cliente.fotoUrl,
        },
        membresia: {
          id: membresia.id,
          plan: membresia.plan.nombre,
          fechaInicio: membresia.fechaInicio,
          fechaVencimiento: membresia.fechaVencimiento,
          duracionDias: membresia.plan.duracionDias,
        },
        diasRestantes,
        estado,
      };
    });
  }

  async renovar(empresaId: string, actorId: string, clienteId: string, dto: RenovarMembresiaDto) {
    const cliente = await this.prisma.cliente.findFirst({ where: { id: clienteId, empresaId } });
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const plan = await this.prisma.planMembresia.findFirst({
      where: { id: dto.planId, empresaId, activo: true },
    });
    if (!plan) {
      throw new BadRequestException('Plan de membresía no encontrado o inactivo');
    }

    const ultima = await this.prisma.membresia.findFirst({
      where: { clienteId },
      orderBy: { fechaVencimiento: 'desc' },
    });

    const hoy = new Date();
    // si aún no vence, la renovación se suma a partir de la fecha de vencimiento actual
    // (no se pierden días por renovar antes de tiempo); si ya venció, arranca desde hoy.
    const fechaInicio = ultima && ultima.fechaVencimiento > hoy ? ultima.fechaVencimiento : hoy;
    const fechaVencimiento = new Date(fechaInicio);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + plan.duracionDias);

    const membresia = await this.prisma.membresia.create({
      data: { empresaId, clienteId, planId: plan.id, fechaInicio, fechaVencimiento },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'crear',
      entidad: 'membresia',
      entidadId: membresia.id,
      detalle: {
        cliente: cliente.nombre,
        plan: plan.nombre,
        fechaVencimiento: fechaVencimiento.toISOString(),
      },
    });

    // el ingreso se registra solo, junto con el resto de movimientos de Cuentas.
    const categoria = await this.prisma.categoriaMovimiento.upsert({
      where: { empresaId_tipo_nombre: { empresaId, tipo: 'ingreso', nombre: 'Membresías' } },
      update: {},
      create: { empresaId, tipo: 'ingreso', nombre: 'Membresías' },
    });

    await this.prisma.movimientoCuenta.create({
      data: {
        empresaId,
        tipo: 'ingreso',
        categoriaId: categoria.id,
        monto: plan.precio,
        fecha: new Date(),
        descripcion: `Membresía: ${plan.nombre} (${cliente.nombre})`,
        clienteId: cliente.id,
        usuarioId: actorId,
        membresiaId: membresia.id,
      },
    });

    return membresia;
  }

  /**
   * Corrige manualmente el vencimiento de una membresía ya creada (ej. se
   * seleccionó el plan equivocado al renovar). No cambia cómo se calculan
   * las próximas renovaciones, solo este registro puntual.
   */
  async editarVencimiento(
    empresaId: string,
    actorId: string,
    membresiaId: string,
    dto: EditarVencimientoMembresiaDto,
  ) {
    const membresia = await this.prisma.membresia.findFirst({
      where: { id: membresiaId, empresaId },
      include: { cliente: { select: { nombre: true } } },
    });
    if (!membresia) {
      throw new NotFoundException('Membresía no encontrada');
    }

    const fechaAnterior = membresia.fechaVencimiento;
    const fechaVencimiento = new Date(dto.fechaVencimiento);

    const actualizada = await this.prisma.membresia.update({
      where: { id: membresiaId },
      data: { fechaVencimiento },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'membresia',
      entidadId: membresia.id,
      detalle: {
        cliente: membresia.cliente.nombre,
        fechaVencimientoAnterior: fechaAnterior.toISOString(),
        fechaVencimientoNueva: fechaVencimiento.toISOString(),
      },
    });

    return actualizada;
  }
}
