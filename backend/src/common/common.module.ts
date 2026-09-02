import { Global, Module } from '@nestjs/common';
import { CaslAbilityFactory } from './casl/casl-ability.factory';
import { PermissionsGuard } from './guards/permissions.guard';
import { ModuloActivoGuard } from './guards/modulo-activo.guard';

@Global()
@Module({
  providers: [CaslAbilityFactory, PermissionsGuard, ModuloActivoGuard],
  exports: [CaslAbilityFactory, PermissionsGuard, ModuloActivoGuard],
})
export class CommonModule {}
