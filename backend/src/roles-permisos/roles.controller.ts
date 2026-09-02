import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CheckPermissions } from '../common/decorators/permissions.decorator';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { RolesService } from './roles.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { AsignarPermisosDto } from './dto/asignar-permisos.dto';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @CheckPermissions('roles.leer')
  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.rolesService.findAll(user.empresaId);
  }

  @CheckPermissions('roles.leer')
  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.rolesService.findOne(user.empresaId, id);
  }

  @CheckPermissions('roles.crear')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRolDto) {
    return this.rolesService.create(user.empresaId, user.id, dto);
  }

  @CheckPermissions('roles.actualizar')
  @Patch(':id/permisos')
  asignarPermisos(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AsignarPermisosDto,
  ) {
    return this.rolesService.asignarPermisos(user.empresaId, user.id, id, dto);
  }
}
