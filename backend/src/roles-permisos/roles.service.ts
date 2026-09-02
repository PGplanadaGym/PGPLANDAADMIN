import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { AsignarPermisosDto } from './dto/asignar-permisos.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  findAll(empresaId: string) {
    return this.prisma.rol.findMany({
      where: { OR: [{ empresaId }, { empresaId: null }] },
      include: { permisos: { include: { permiso: true } } },
    });
  }

  async findOne(empresaId: string, id: string) {
    const rol = await this.prisma.rol.findFirst({
      where: { id, OR: [{ empresaId }, { empresaId: null }] },
      include: { permisos: { include: { permiso: true } } },
    });

    if (!rol) {
      throw new NotFoundException('Rol no encontrado');
    }

    return rol;
  }

  async create(empresaId: string, actorId: string, dto: CreateRolDto) {
    const rol = await this.prisma.rol.create({
      data: { empresaId, nombre: dto.nombre, descripcion: dto.descripcion },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'crear',
      entidad: 'rol',
      entidadId: rol.id,
      detalle: { nombre: rol.nombre },
    });

    return rol;
  }

  async asignarPermisos(
    empresaId: string,
    actorId: string,
    rolId: string,
    dto: AsignarPermisosDto,
  ) {
    await this.findOne(empresaId, rolId);
    await this.prisma.rolPermiso.deleteMany({ where: { rolId } });
    await this.prisma.rolPermiso.createMany({
      data: dto.permisoIds.map((permisoId) => ({ rolId, permisoId })),
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'rol',
      entidadId: rolId,
      detalle: { permisoIds: dto.permisoIds },
    });

    return this.findOne(empresaId, rolId);
  }
}
