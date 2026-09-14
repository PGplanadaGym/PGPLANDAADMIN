import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Injectable()
export class EmpresasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findOne(id: string) {
    const empresa = await this.prisma.empresa.findUnique({ where: { id } });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return empresa;
  }

  /** Cada despliegue sirve a una sola empresa: usada por la pantalla de login (sin autenticación) para mostrar su marca. */
  async findBrandingPublico() {
    const empresa = await this.prisma.empresa.findFirst({
      orderBy: { creadoEn: 'asc' },
      select: { nombre: true, logoUrl: true, colorPrimario: true },
    });
    return (
      empresa ?? { nombre: 'Backoffice Core', logoUrl: null, colorPrimario: null }
    );
  }

  async update(id: string, actorId: string, dto: UpdateEmpresaDto) {
    await this.findOne(id);
    const empresa = await this.prisma.empresa.update({ where: { id }, data: dto });

    await this.auditoriaService.registrar({
      empresaId: id,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'empresa',
      entidadId: id,
      detalle: { ...dto },
    });

    return empresa;
  }
}
