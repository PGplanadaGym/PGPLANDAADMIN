import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RequestUser } from '../decorators/current-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    const ability = this.caslAbilityFactory.build(user.permisos ?? []);
    const permitido = requiredPermissions.every((permiso) =>
      ability.can(permiso, 'all'),
    );

    if (!permitido) {
      throw new ForbiddenException('No tienes permiso para esta acción');
    }

    return true;
  }
}
