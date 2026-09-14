import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../auth/email.service';

@Injectable()
export class RecordatoriosService {
  private readonly logger = new Logger(RecordatoriosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async enviarRecordatoriosDelDiaSiguiente() {
    const inicioManana = new Date();
    inicioManana.setDate(inicioManana.getDate() + 1);
    inicioManana.setHours(0, 0, 0, 0);

    const finManana = new Date(inicioManana);
    finManana.setHours(23, 59, 59, 999);

    const citas = await this.prisma.cita.findMany({
      where: {
        fechaInicio: { gte: inicioManana, lte: finManana },
        estado: { notIn: ['cancelada', 'completada', 'no_asistio'] },
        recordatorioEnviado: false,
        cliente: { email: { not: null } },
      },
      include: { cliente: true, tipoCita: true },
    });

    for (const cita of citas) {
      if (!cita.cliente?.email) continue;

      await this.emailService.enviarRecordatorioCita(
        cita.cliente.email,
        cita.cliente.nombre,
        cita.tipoCita.nombre,
        cita.fechaInicio,
      );

      await this.prisma.cita.update({
        where: { id: cita.id },
        data: { recordatorioEnviado: true },
      });
    }

    if (citas.length > 0) {
      this.logger.log(`Recordatorios enviados: ${citas.length}`);
    }
  }
}
