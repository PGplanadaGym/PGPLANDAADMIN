import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CrearNotificacionParams {
  empresaId: string;
  usuarioId?: string | null;
  tipo: string;
  titulo: string;
  mensaje: string;
  enlace?: string;
}

@Injectable()
export class NotificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Nunca debe tumbar la acción original que la dispara (venta, movimiento de
   * stock, cita, etc.) — si falla, se ignora silenciosamente.
   */
  async crear(params: CrearNotificacionParams) {
    try {
      await this.prisma.notificacion.create({
        data: {
          empresaId: params.empresaId,
          usuarioId: params.usuarioId ?? null,
          tipo: params.tipo,
          titulo: params.titulo,
          mensaje: params.mensaje,
          enlace: params.enlace,
        },
      });
    } catch {
      // ver comentario arriba
    }
  }

  findMias(empresaId: string, usuarioId: string, soloNoLeidas: boolean) {
    return this.prisma.notificacion.findMany({
      where: {
        empresaId,
        OR: [{ usuarioId }, { usuarioId: null }],
        ...(soloNoLeidas ? { leida: false } : {}),
      },
      orderBy: { creadoEn: 'desc' },
      take: 50,
    });
  }

  contarNoLeidas(empresaId: string, usuarioId: string) {
    return this.prisma.notificacion.count({
      where: {
        empresaId,
        OR: [{ usuarioId }, { usuarioId: null }],
        leida: false,
      },
    });
  }

  async marcarLeida(empresaId: string, usuarioId: string, id: string) {
    const notificacion = await this.prisma.notificacion.findFirst({
      where: { id, empresaId, OR: [{ usuarioId }, { usuarioId: null }] },
    });
    if (!notificacion) return { success: false };

    await this.prisma.notificacion.update({
      where: { id },
      data: { leida: true },
    });
    return { success: true };
  }

  async marcarTodasLeidas(empresaId: string, usuarioId: string) {
    await this.prisma.notificacion.updateMany({
      where: {
        empresaId,
        OR: [{ usuarioId }, { usuarioId: null }],
        leida: false,
      },
      data: { leida: true },
    });
    return { success: true };
  }
}
