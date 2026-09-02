import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { MODULO_KEY } from '../decorators/requiere-modulo.decorator';
import { RequestUser } from '../decorators/current-user.decorator';

@Injectable()
export class ModuloActivoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduloClave = this.reflector.getAllAndOverride<string>(MODULO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!moduloClave) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    const empresaModulo = await this.prisma.empresaModulo.findFirst({
      where: {
        empresaId: user.empresaId,
        activo: true,
        modulo: { clave: moduloClave },
      },
    });

    if (!empresaModulo) {
      throw new ForbiddenException(
        `El módulo "${moduloClave}" no está activo para tu empresa`,
      );
    }

    return true;
  }
}
