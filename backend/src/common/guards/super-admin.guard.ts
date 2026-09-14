import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { RequestUser } from '../decorators/current-user.decorator';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;

    if (!user?.esSuperAdmin) {
      throw new ForbiddenException('Esta acción es solo para el administrador de la plataforma');
    }

    return true;
  }
}
