import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { endOfDay, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { PrismaService } from '../prisma/prisma.service';
import { MarcarAsistenciaDto } from './dto/marcar-asistencia.dto';

const SELECT_USUARIO_BASICO = { id: true, nombre: true, email: true, fotoUrl: true } as const;

const SIGUIENTES_PERMITIDOS: Record<string, string[]> = {
  ninguno: ['entrada'],
  entrada: ['inicio_comida', 'salida'],
  inicio_comida: ['fin_comida'],
  fin_comida: ['salida'],
  salida: [],
};

const MENSAJE_ULTIMO_TIPO: Record<string, string> = {
  ninguno: 'Debes marcar tu entrada primero',
  entrada: 'Ya marcaste tu entrada; ahora toca iniciar comida o marcar salida',
  inicio_comida: 'Debes marcar el fin de tu comida antes de continuar',
  fin_comida: 'Ya terminaste tu comida; ahora toca marcar salida',
  salida: 'Ya marcaste tu salida de hoy',
};

@Injectable()
export class AsistenciaService {
  constructor(private readonly prisma: PrismaService) {}

  private async zonaHorariaDe(empresaId: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { zonaHoraria: true },
    });
    return empresa?.zonaHoraria ?? 'America/Guayaquil';
  }

  private async rangoDeHoy(empresaId: string) {
    const zonaHoraria = await this.zonaHorariaDe(empresaId);
    const ahoraZonado = toZonedTime(new Date(), zonaHoraria);
    return {
      inicio: fromZonedTime(startOfDay(ahoraZonado), zonaHoraria),
      fin: fromZonedTime(endOfDay(ahoraZonado), zonaHoraria),
    };
  }

  private async marcacionesDeHoy(empresaId: string, usuarioId: string) {
    const { inicio, fin } = await this.rangoDeHoy(empresaId);
    return this.prisma.marcacion.findMany({
      where: { empresaId, usuarioId, creadoEn: { gte: inicio, lte: fin } },
      orderBy: { creadoEn: 'asc' },
    });
  }

  async estadoActual(empresaId: string, usuarioId: string) {
    const marcacionesHoy = await this.marcacionesDeHoy(empresaId, usuarioId);
    const ultimoTipo = marcacionesHoy.at(-1)?.tipo ?? 'ninguno';

    return {
      marcacionesHoy,
      ultimoTipo,
      siguientesPermitidos: SIGUIENTES_PERMITIDOS[ultimoTipo] ?? [],
    };
  }

  async marcar(empresaId: string, usuarioId: string, dto: MarcarAsistenciaDto) {
    const marcacionesHoy = await this.marcacionesDeHoy(empresaId, usuarioId);
    const ultimoTipo = marcacionesHoy.at(-1)?.tipo ?? 'ninguno';

    if (!SIGUIENTES_PERMITIDOS[ultimoTipo]?.includes(dto.tipo)) {
      throw new ConflictException(MENSAJE_ULTIMO_TIPO[ultimoTipo] ?? 'No puedes registrar esa marcación ahora');
    }

    return this.prisma.marcacion.create({
      data: {
        empresaId,
        usuarioId,
        tipo: dto.tipo,
        latitud: dto.latitud,
        longitud: dto.longitud,
        precision: dto.precision,
      },
    });
  }

  misMarcaciones(empresaId: string, usuarioId: string, desde?: string, hasta?: string) {
    return this.prisma.marcacion.findMany({
      where: {
        empresaId,
        usuarioId,
        ...(desde || hasta
          ? {
              creadoEn: {
                ...(desde ? { gte: new Date(desde) } : {}),
                ...(hasta ? { lte: new Date(hasta) } : {}),
              },
            }
          : {}),
      },
      orderBy: { creadoEn: 'desc' },
      take: 200,
    });
  }

  async findAll(empresaId: string, usuarioId?: string, desde?: string, hasta?: string) {
    if (usuarioId) {
      const usuario = await this.prisma.usuario.findFirst({ where: { id: usuarioId, empresaId } });
      if (!usuario) {
        throw new NotFoundException('Colaborador no encontrado');
      }
    }

    return this.prisma.marcacion.findMany({
      where: {
        empresaId,
        ...(usuarioId ? { usuarioId } : {}),
        ...(desde || hasta
          ? {
              creadoEn: {
                ...(desde ? { gte: new Date(desde) } : {}),
                ...(hasta ? { lte: new Date(hasta) } : {}),
              },
            }
          : {}),
      },
      include: { usuario: { select: SELECT_USUARIO_BASICO } },
      orderBy: { creadoEn: 'desc' },
      take: 500,
    });
  }
}
