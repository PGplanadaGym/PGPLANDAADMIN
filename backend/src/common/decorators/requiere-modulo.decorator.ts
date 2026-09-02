import { SetMetadata } from '@nestjs/common';

export const MODULO_KEY = 'moduloRequerido';

export const RequiereModulo = (clave: string) => SetMetadata(MODULO_KEY, clave);
