import { Injectable } from '@nestjs/common';
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

@Injectable()
export class AuditoriaService {
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

  findAll(empresaId: string, take = 100) {
    return this.prisma.registroAuditoria.findMany({
      where: { empresaId },
      include: { usuario: { select: { nombre: true, email: true } } },
      orderBy: { creadoEn: 'desc' },
      take,
    });
  }
}
