import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface EmpresaBranding {
  nombre: string;
  logoUrl: string | null;
  colorPrimario: string | null;
}

export interface RequestUser {
  id: string;
  empresaId: string;
  nombre: string;
  email: string;
  fotoUrl: string | null;
  permisos: string[];
  empresa: EmpresaBranding;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
