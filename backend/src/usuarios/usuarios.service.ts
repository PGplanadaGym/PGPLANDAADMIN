import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../auth/email.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { AsignarRolesDto } from './dto/asignar-roles.dto';
import { UpdateUsuarioAdminDto } from './dto/update-usuario-admin.dto';

// Relaciones que cuentan como "este usuario ya tiene algo asignado" (ventas, asistencia,
// activos a su cargo, etc.) — no incluye roles/sesiones/notificaciones, que no son "actividad"
// sino solo metadatos de la cuenta y se limpian solos al eliminarla.
const ACTIVIDAD_COUNT_SELECT = {
  activosAsignados: true,
  asignacionesRealizadas: true,
  movimientosStock: true,
  marcaciones: true,
  movimientosCuenta: true,
  ordenes: true,
  ordenesCompra: true,
  pagosNomina: true,
  pagosNominaRegistrados: true,
  recursosVinculados: true,
  mantenimientosActivo: true,
  sucursalesEncargado: true,
  medicionesCorporales: true,
} as const;

const USUARIO_SELECT = {
  id: true,
  nombre: true,
  email: true,
  fotoUrl: true,
  telefono: true,
  cargo: true,
  bio: true,
  activo: true,
  passwordConfigurada: true,
  creadoEn: true,
  sucursal: { select: { id: true, nombre: true } },
  roles: { select: { rol: { select: { id: true, nombre: true } } } },
  _count: { select: ACTIVIDAD_COUNT_SELECT },
} as const;

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  findAll(empresaId: string) {
    return this.prisma.usuario.findMany({
      where: { empresaId },
      select: USUARIO_SELECT,
    });
  }

  async findOne(empresaId: string, id: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, empresaId },
      select: USUARIO_SELECT,
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario;
  }

  /** El administrador define la contraseña del empleado directamente al crearlo. */
  async create(empresaId: string, actorId: string, dto: CreateUsuarioDto) {
    if (dto.rolIds?.length) {
      const rolesValidos = await this.prisma.rol.count({
        where: {
          id: { in: dto.rolIds },
          OR: [{ empresaId }, { empresaId: null }],
        },
      });
      if (rolesValidos !== dto.rolIds.length) {
        throw new BadRequestException(
          'Uno o más roles no pertenecen a tu empresa',
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const usuario = await this.prisma.usuario.create({
      data: {
        empresaId,
        nombre: dto.nombre,
        email: dto.email,
        passwordHash,
        passwordConfigurada: true,
      },
    });

    if (dto.rolIds?.length) {
      await this.prisma.usuarioRol.createMany({
        data: dto.rolIds.map((rolId) => ({ usuarioId: usuario.id, rolId })),
      });
    }

    return this.findOne(empresaId, usuario.id);
  }

  /** Activa o desactiva el acceso de un usuario. Desactivar revoca de inmediato sus
   * sesiones (refresh tokens) — no basta con bloquear logins futuros. */
  async cambiarActivo(
    empresaId: string,
    actorId: string,
    usuarioId: string,
    activo: boolean,
  ) {
    if (usuarioId === actorId) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }

    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: usuarioId },
        data: { activo },
      }),
      ...(activo
        ? []
        : [
            this.prisma.refreshToken.updateMany({
              where: { usuarioId },
              data: { revocado: true },
            }),
          ]),
    ]);

    return this.findOne(empresaId, usuarioId);
  }

  /**
   * `permisosVisor` son los permisos de quien hace la petición (no del usuario consultado):
   * - `pagosNomina` trae sueldos, así que solo se incluye si el visor tiene `nomina.leer` —
   *   de lo contrario cualquier rol con `usuarios.leer` (ej. "ver directorio de empleados")
   *   podría ver el historial salarial de todos sin tener permiso de Nómina.
   */
  async perfilCompleto(empresaId: string, id: string, permisosVisor: string[]) {
    const usuario = await this.findOne(empresaId, id);
    const puedeVerNomina = permisosVisor.includes('nomina.leer');

    const [activosAsignados, marcaciones, pagosNomina, ultimaSesion] = await Promise.all([
      this.prisma.asignacionActivo.findMany({
        where: { empresaId, usuarioId: id, fechaDevolucion: null },
        include: { activo: { select: { id: true, nombre: true } } },
        orderBy: { fechaAsignacion: 'desc' },
      }),
      this.prisma.marcacion.findMany({
        where: { empresaId, usuarioId: id },
        orderBy: { creadoEn: 'desc' },
        take: 10,
      }),
      puedeVerNomina
        ? this.prisma.pagoNomina.findMany({
            where: { empresaId, empleadoId: id },
            orderBy: { fechaPago: 'desc' },
            take: 10,
          })
        : Promise.resolve([]),
      this.prisma.refreshToken.findFirst({
        where: { usuarioId: id },
        orderBy: { inicioSesionEn: 'desc' },
        select: { inicioSesionEn: true },
      }),
    ]);

    return {
      usuario,
      activosAsignados,
      marcaciones,
      pagosNomina,
      ultimoInicioSesion: ultimaSesion?.inicioSesionEn ?? null,
    };
  }

  /** Edición de datos básicos de un empleado hecha por un administrador. */
  async updateAdmin(
    empresaId: string,
    actorId: string,
    usuarioId: string,
    dto: UpdateUsuarioAdminDto,
  ) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        nombre: dto.nombre,
        cargo: dto.cargo,
        telefono: dto.telefono,
        bio: dto.bio,
      },
    });

    return this.findOne(empresaId, usuarioId);
  }

  async updateSelf(usuarioId: string, dto: UpdatePerfilDto) {
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        nombre: dto.nombre,
        fotoUrl: dto.fotoUrl,
        telefono: dto.telefono,
        cargo: dto.cargo,
        bio: dto.bio,
      },
    });

    return this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
      select: USUARIO_SELECT,
    });
  }

  async asignarRoles(
    empresaId: string,
    actorId: string,
    usuarioId: string,
    dto: AsignarRolesDto,
  ) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.rolIds.length > 0) {
      const rolesValidos = await this.prisma.rol.count({
        where: {
          id: { in: dto.rolIds },
          OR: [{ empresaId }, { empresaId: null }],
        },
      });
      if (rolesValidos !== dto.rolIds.length) {
        throw new BadRequestException(
          'Uno o más roles no pertenecen a tu empresa',
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.usuarioRol.deleteMany({ where: { usuarioId } }),
      this.prisma.usuarioRol.createMany({
        data: dto.rolIds.map((rolId) => ({ usuarioId, rolId })),
      }),
    ]);

    return this.findOne(empresaId, usuarioId);
  }

  async asignarSucursal(
    empresaId: string,
    actorId: string,
    usuarioId: string,
    sucursalId: string | null,
  ) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (sucursalId) {
      const sucursal = await this.prisma.sucursal.findFirst({
        where: { id: sucursalId, empresaId },
      });
      if (!sucursal) {
        throw new BadRequestException('Sucursal no encontrada');
      }
    }

    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { sucursalId },
    });

    return this.findOne(empresaId, usuarioId);
  }

  async cambiarPassword(usuarioId: string, dto: CambiarPasswordDto) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
    });

    const passwordValida = await bcrypt.compare(
      dto.passwordActual,
      usuario.passwordHash,
    );

    if (!passwordValida) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }

    const passwordHash = await bcrypt.hash(dto.passwordNueva, 10);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: usuarioId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { usuarioId },
        data: { revocado: true },
      }),
    ]);

    await this.emailService.enviarAvisoCambioPassword(
      usuario.email,
      usuario.nombre,
    );

    return { success: true };
  }

  /** Solo se puede eliminar un usuario que nunca registró actividad (ventas, asistencia,
   * activos a su cargo, etc.) — si ya tiene algo asignado, la vía correcta es desactivarlo. */
  async remove(empresaId: string, actorId: string, id: string) {
    if (id === actorId) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta');
    }

    const usuario = await this.prisma.usuario.findFirst({
      where: { id, empresaId },
      include: { _count: { select: ACTIVIDAD_COUNT_SELECT } },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const enUso = Object.values(usuario._count).some((cantidad) => cantidad > 0);
    if (enUso) {
      throw new ConflictException(
        'Este usuario ya tiene actividad registrada (ventas, asistencia, activos asignados, etc.) y no se puede eliminar. Desactívalo en su lugar.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.usuarioRol.deleteMany({ where: { usuarioId: id } }),
      this.prisma.refreshToken.deleteMany({ where: { usuarioId: id } }),
      this.prisma.passwordResetToken.deleteMany({ where: { usuarioId: id } }),
      this.prisma.usuario.delete({ where: { id } }),
    ]);
  }
}
