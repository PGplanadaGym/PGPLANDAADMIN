import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PermisosController } from './permisos.controller';
import { PermisosService } from './permisos.service';

@Module({
  controllers: [RolesController, PermisosController],
  providers: [RolesService, PermisosService],
})
export class RolesPermisosModule {}
