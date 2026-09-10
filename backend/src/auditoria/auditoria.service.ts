import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface RegistrarParams {
  empresaId: string;
  usuarioId?: string;
  accion: string;
  entidad: string;
  entidadId?: string;
  detalle?: Record<string, unknown>;
}

interface FindAllParams {
  desde?: string;
  hasta?: string;
  antes?: string;
  take?: number;
}

interface ExportarParams {
  desde?: string;
  hasta?: string;
}

const RETENCION_DIAS = 365;
const TOPE_EXPORTACION = 5000;

function construirFiltroFecha(filtros: {
  desde?: string;
  hasta?: string;
  antes?: string;
}): Prisma.DateTimeFilter {
  const creadoEn: Prisma.DateTimeFilter = {};
  if (filtros.desde) creadoEn.gte = new Date(filtros.desde);
  if (filtros.hasta) creadoEn.lte = new Date(filtros.hasta);
  if (filtros.antes) creadoEn.lt = new Date(filtros.antes);
  return creadoEn;
}

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registrar(params: RegistrarParams) {
    try {
      await this.prisma.registroAuditoria.create({
        data: {
          ...params,
          detalle: params.detalle as Prisma.InputJsonValue | undefined,
        },
      });
    } catch {
      // El audit log nunca debe tumbar la acción original que lo disparó.
    }
  }

  findAll(empresaId: string, filtros: FindAllParams = {}) {
    const creadoEn = construirFiltroFecha(filtros);

    return this.prisma.registroAuditoria.findMany({
      where: {
        empresaId,
        ...(Object.keys(creadoEn).length > 0 ? { creadoEn } : {}),
      },
      include: { usuario: { select: { nombre: true, email: true } } },
      orderBy: { creadoEn: 'desc' },
      take: Math.min(filtros.take ?? 50, 500),
    });
  }

  exportar(empresaId: string, filtros: ExportarParams = {}) {
    const creadoEn = construirFiltroFecha(filtros);

    return this.prisma.registroAuditoria.findMany({
      where: {
        empresaId,
        ...(Object.keys(creadoEn).length > 0 ? { creadoEn } : {}),
      },
      include: { usuario: { select: { nombre: true, email: true } } },
      orderBy: { creadoEn: 'desc' },
      take: TOPE_EXPORTACION,
    });
  }

  @Cron('0 3 1 * *')
  async archivarAntiguos() {
    const limite = new Date();
    limite.setDate(limite.getDate() - RETENCION_DIAS);

    const { count } = await this.prisma.registroAuditoria.deleteMany({
      where: { creadoEn: { lt: limite } },
    });

    if (count > 0) {
      this.logger.log(
        `Actividad: eliminados ${count} registros de más de ${RETENCION_DIAS} días`,
      );
    }
  }
}
