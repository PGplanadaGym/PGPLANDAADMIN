import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';

interface JwtPayload {
  sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.access_token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: {
        empresa: true,
        roles: {
          include: {
            rol: { include: { permisos: { include: { permiso: true } } } },
          },
        },
      },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario inválido o inactivo');
    }

    const permisos = Array.from(
      new Set(
        usuario.roles.flatMap((usuarioRol) =>
          usuarioRol.rol.permisos.map((rolPermiso) => rolPermiso.permiso.clave),
        ),
      ),
    );

    return {
      id: usuario.id,
      empresaId: usuario.empresaId,
      nombre: usuario.nombre,
      email: usuario.email,
      fotoUrl: usuario.fotoUrl,
      permisos,
      sucursalId: usuario.sucursalId,
      empresa: {
        nombre: usuario.empresa.nombre,
        razonSocial: usuario.empresa.razonSocial,
        logoUrl: usuario.empresa.logoUrl,
        colorPrimario: usuario.empresa.colorPrimario,
        ruc: usuario.empresa.ruc,
        direccion: usuario.empresa.direccion,
        telefono: usuario.empresa.telefono,
      },
    };
  }
}
