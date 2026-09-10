import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { AsignarPermisosDto } from './dto/asignar-permisos.dto';

/**
 * Permisos que, si nadie en la empresa los tiene, dejan a la empresa sin forma de
 * volver a gestionar roles/usuarios desde la propia UI (habría que entrar directo
 * a la base de datos para arreglarlo). Se protegen contra un "autobloqueo".
 */
const PERMISOS_CRITICOS = ['roles.actualizar', 'usuarios.actualizar'];

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  findAll(empresaId: string) {
    return this.prisma.rol.findMany({
      where: { OR: [{ empresaId }, { empresaId: null }] },
      include: {
        permisos: { include: { permiso: true } },
        _count: { select: { usuarios: true } },
      },
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
    const existente = await this.prisma.rol.findUnique({
      where: { empresaId_nombre: { empresaId, nombre: dto.nombre } },
    });
    if (existente) {
      throw new ConflictException('Ya existe un rol con ese nombre');
    }

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

  async update(
    empresaId: string,
    actorId: string,
    rolId: string,
    dto: UpdateRolDto,
  ) {
    const rol = await this.findOne(empresaId, rolId);
    if (rol.empresaId === null) {
      throw new BadRequestException('No puedes editar un rol de sistema');
    }

    if (dto.nombre && dto.nombre !== rol.nombre) {
      const existente = await this.prisma.rol.findUnique({
        where: { empresaId_nombre: { empresaId, nombre: dto.nombre } },
      });
      if (existente) {
        throw new ConflictException('Ya existe un rol con ese nombre');
      }
    }

    await this.prisma.rol.update({
      where: { id: rolId },
      data: { nombre: dto.nombre, descripcion: dto.descripcion },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'rol',
      entidadId: rolId,
      detalle: { nombre: dto.nombre, descripcion: dto.descripcion },
    });

    return this.findOne(empresaId, rolId);
  }

  async remove(empresaId: string, actorId: string, rolId: string) {
    const rol = await this.prisma.rol.findFirst({
      where: { id: rolId, empresaId },
      include: { _count: { select: { usuarios: true } } },
    });
    if (!rol) {
      throw new NotFoundException('Rol no encontrado');
    }

    if (rol._count.usuarios > 0) {
      throw new ConflictException(
        `Este rol tiene ${rol._count.usuarios} persona(s) asignada(s). Quítaselo primero desde Usuarios antes de eliminarlo.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.rolPermiso.deleteMany({ where: { rolId } }),
      this.prisma.rol.delete({ where: { id: rolId } }),
    ]);

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId: actorId,
      accion: 'eliminar',
      entidad: 'rol',
      entidadId: rolId,
      detalle: { nombre: rol.nombre },
    });

    return { success: true };
  }

  /**
   * Si el cambio le quita a este rol un permiso crítico, verifica que algún OTRO rol
   * (sin tocar, ya que en esta operación solo se modifica `rolId`) siga otorgándoselo
   * a al menos un usuario activo de la empresa. Si nadie más lo tendría, se bloquea.
   */
  private async validarNoAutobloqueo(
    empresaId: string,
    rolId: string,
    nuevosPermisoIds: Set<string>,
  ) {
    for (const clave of PERMISOS_CRITICOS) {
      const permiso = await this.prisma.permiso.findUnique({
        where: { clave },
      });
      if (!permiso || nuevosPermisoIds.has(permiso.id)) continue;

      const hayOtraVia = await this.prisma.usuario.count({
        where: {
          empresaId,
          activo: true,
          roles: {
            some: {
              rolId: { not: rolId },
              rol: { permisos: { some: { permiso: { clave } } } },
            },
          },
        },
      });

      if (hayOtraVia === 0) {
        throw new BadRequestException(
          `No puedes quitar el permiso "${clave}" de este rol: dejaría a la empresa sin nadie que pueda gestionar usuarios y roles`,
        );
      }
    }
  }

  async asignarPermisos(
    empresaId: string,
    actorId: string,
    rolId: string,
    dto: AsignarPermisosDto,
  ) {
    await this.findOne(empresaId, rolId);

    if (dto.permisoIds.length > 0) {
      const permisosValidos = await this.prisma.permiso.count({
        where: { id: { in: dto.permisoIds } },
      });
      if (permisosValidos !== dto.permisoIds.length) {
        throw new BadRequestException('Uno o más permisos no existen');
      }
    }

    await this.validarNoAutobloqueo(empresaId, rolId, new Set(dto.permisoIds));

    await this.prisma.$transaction([
      this.prisma.rolPermiso.deleteMany({ where: { rolId } }),
      this.prisma.rolPermiso.createMany({
        data: dto.permisoIds.map((permisoId) => ({ rolId, permisoId })),
      }),
    ]);

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
