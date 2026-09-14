import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../auth/email.service';

const DIAS_ANTES_DE_AVISAR = 3;

@Injectable()
export class AvisosMembresiaService {
  private readonly logger = new Logger(AvisosMembresiaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async avisarVencimientosProximos() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + DIAS_ANTES_DE_AVISAR);
    limite.setHours(23, 59, 59, 999);

    const membresias = await this.prisma.membresia.findMany({
      where: {
        fechaVencimiento: { gte: hoy, lte: limite },
        avisoEnviado: false,
        cliente: { email: { not: null } },
      },
      include: { cliente: true },
    });

    for (const membresia of membresias) {
      if (!membresia.cliente.email) continue;

      await this.emailService.enviarAvisoMembresiaPorVencer(
        membresia.cliente.email,
        membresia.cliente.nombre,
        membresia.fechaVencimiento,
      );

      await this.prisma.membresia.update({
        where: { id: membresia.id },
        data: { avisoEnviado: true },
      });
    }

    if (membresias.length > 0) {
      this.logger.log(`Avisos de membresía enviados: ${membresias.length}`);
    }
  }
}
