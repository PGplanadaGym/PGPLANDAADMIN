import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { generarTokenPlano, hashToken } from '../common/token.util';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
const ACCESS_TOKEN_TTL = '15m';
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

interface SesionMeta {
  sessionId?: string;
  inicioSesionEn?: Date;
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async login(email: string, password: string, meta?: SesionMeta) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await bcrypt.compare(password, usuario.passwordHash);

    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.emitirTokens(usuario.id, meta);
  }

  async emitirTokens(usuarioId: string, meta: SesionMeta = {}) {
    const accessToken = await this.jwtService.signAsync(
      { sub: usuarioId },
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    const refreshTokenPlano = generarTokenPlano(48);
    const sessionId = meta.sessionId ?? randomUUID();
    const inicioSesionEn = meta.inicioSesionEn ?? new Date();

    await this.prisma.refreshToken.create({
      data: {
        usuarioId,
        tokenHash: hashToken(refreshTokenPlano),
        sessionId,
        inicioSesionEn,
        userAgent: meta.userAgent,
        ip: meta.ip,
        expiraEn: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { accessToken, refreshToken: refreshTokenPlano };
  }

  /** Rota el refresh token: revoca el usado y emite un par nuevo, conservando la misma "sesión". */
  async refrescar(refreshTokenPlano: string | undefined) {
    if (!refreshTokenPlano) {
      throw new UnauthorizedException(
        'Sesión inválida, inicia sesión de nuevo',
      );
    }

    const tokenHash = hashToken(refreshTokenPlano);
    const registro = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!registro || registro.revocado || registro.expiraEn < new Date()) {
      throw new UnauthorizedException(
        'Sesión inválida, inicia sesión de nuevo',
      );
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: registro.usuarioId },
    });
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException(
        'Sesión inválida, inicia sesión de nuevo',
      );
    }

    await this.prisma.refreshToken.update({
      where: { id: registro.id },
      data: { revocado: true },
    });

    return this.emitirTokens(registro.usuarioId, {
      sessionId: registro.sessionId,
      inicioSesionEn: registro.inicioSesionEn,
      userAgent: registro.userAgent ?? undefined,
      ip: registro.ip ?? undefined,
    });
  }

  async logout(refreshTokenPlano: string | undefined) {
    if (!refreshTokenPlano) return;

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshTokenPlano) },
      data: { revocado: true },
    });
  }

  async listarSesiones(
    usuarioId: string,
    refreshTokenActualPlano: string | undefined,
  ) {
    const hashActual = refreshTokenActualPlano
      ? hashToken(refreshTokenActualPlano)
      : null;

    const sesiones = await this.prisma.refreshToken.findMany({
      where: { usuarioId, revocado: false, expiraEn: { gt: new Date() } },
      orderBy: { inicioSesionEn: 'desc' },
    });

    return sesiones.map((sesion) => ({
      id: sesion.id,
      userAgent: sesion.userAgent,
      ip: sesion.ip,
      inicioSesionEn: sesion.inicioSesionEn,
      esActual: sesion.tokenHash === hashActual,
    }));
  }

  async revocarSesion(usuarioId: string, sesionId: string) {
    const registro = await this.prisma.refreshToken.findFirst({
      where: { id: sesionId, usuarioId },
    });

    if (!registro) {
      throw new NotFoundException('Sesión no encontrada');
    }

    await this.prisma.refreshToken.update({
      where: { id: registro.id },
      data: { revocado: true },
    });
  }

  async cerrarOtrasSesiones(
    usuarioId: string,
    refreshTokenActualPlano: string | undefined,
  ) {
    const hashActual = refreshTokenActualPlano
      ? hashToken(refreshTokenActualPlano)
      : undefined;

    await this.prisma.refreshToken.updateMany({
      where: {
        usuarioId,
        revocado: false,
        ...(hashActual ? { NOT: { tokenHash: hashActual } } : {}),
      },
      data: { revocado: true },
    });
  }

  /** Siempre responde igual exista o no el email, para no revelar qué correos están registrados. */
  async solicitarResetPassword(email: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });

    if (!usuario || !usuario.activo) return;

    const tokenPlano = generarTokenPlano(32);
    await this.prisma.passwordResetToken.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: hashToken(tokenPlano),
        expiraEn: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/reset-password?token=${tokenPlano}`;
    await this.emailService.enviarResetPassword(
      usuario.email,
      usuario.nombre,
      resetUrl,
    );
  }

  async resetPassword(tokenPlano: string, nuevaPassword: string) {
    const tokenHash = hashToken(tokenPlano);
    const registro = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { usuario: true },
    });

    if (!registro || registro.usado || registro.expiraEn < new Date()) {
      throw new UnauthorizedException(
        'El link de recuperación es inválido o ya venció',
      );
    }

    const passwordHash = await bcrypt.hash(nuevaPassword, 10);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: registro.usuarioId },
        data: { passwordHash, passwordConfigurada: true },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: registro.id },
        data: { usado: true },
      }),
      this.prisma.refreshToken.updateMany({
        where: { usuarioId: registro.usuarioId },
        data: { revocado: true },
      }),
    ]);

    await this.emailService.enviarAvisoCambioPassword(
      registro.usuario.email,
      registro.usuario.nombre,
    );
  }
}
