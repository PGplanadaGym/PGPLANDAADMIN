import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

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

  async setActivo(empresaId: string, actorId: string, clave: string, activo: boolean) {
    const modulo = await this.prisma.modulo.findUnique({ where: { clave } });

    if (!modulo) {
      throw new NotFoundException('Módulo no encontrado');
    }

    await this.prisma.empresaModulo.upsert({
      where: { empresaId_moduloId: { empresaId, moduloId: modulo.id } },
      update: { activo },
      create: { empresaId, moduloId: modulo.id, activo },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: activo ? 'activar' : 'desactivar',
      entidad: 'modulo',
      entidadId: modulo.id,
      detalle: { clave: modulo.clave, nombre: modulo.nombre },
    });

    return { ...modulo, activo };
  }
}
