import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface EmpresaBranding {
  nombre: string;
  razonSocial: string | null;
  logoUrl: string | null;
  colorPrimario: string | null;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
}

export interface RequestUser {
  id: string;
  empresaId: string;
  nombre: string;
  email: string;
  fotoUrl: string | null;
  permisos: string[];
  sucursalId: string | null;
  empresa: EmpresaBranding;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
