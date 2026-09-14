import { Global, Module } from '@nestjs/common';
import { CaslAbilityFactory } from './casl/casl-ability.factory';
import { PermissionsGuard } from './guards/permissions.guard';

@Global()
@Module({
  providers: [CaslAbilityFactory, PermissionsGuard],
  exports: [CaslAbilityFactory, PermissionsGuard],
})
export class CommonModule {}
