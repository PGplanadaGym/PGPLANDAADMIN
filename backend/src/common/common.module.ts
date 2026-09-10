import { Global, Module } from '@nestjs/common';
import { CaslAbilityFactory } from './casl/casl-ability.factory';
import { PermissionsGuard } from './guards/permissions.guard';
import { ModuloActivoGuard } from './guards/modulo-activo.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';

@Global()
@Module({
  providers: [CaslAbilityFactory, PermissionsGuard, ModuloActivoGuard, SuperAdminGuard],
  exports: [CaslAbilityFactory, PermissionsGuard, ModuloActivoGuard, SuperAdminGuard],
})
export class CommonModule {}
