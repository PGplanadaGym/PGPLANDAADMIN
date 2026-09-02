import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CheckPermissions } from '../common/decorators/permissions.decorator';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { ModulosService } from './modulos.service';
import { ActualizarModuloDto } from './dto/actualizar-modulo.dto';

@ApiTags('modulos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('modulos')
export class ModulosController {
  constructor(private readonly modulosService: ModulosService) {}

  // Sin @CheckPermissions: cualquier usuario autenticado necesita saber qué
  // módulos están activos para poder armar su propio menú lateral.
  @Get()
  findEstado(@CurrentUser() user: RequestUser) {
    return this.modulosService.findEstadoPorEmpresa(user.empresaId);
  }

  @CheckPermissions('modulos.actualizar')
  @Patch(':clave')
  actualizar(
    @CurrentUser() user: RequestUser,
    @Param('clave') clave: string,
    @Body() dto: ActualizarModuloDto,
  ) {
    return this.modulosService.setActivo(user.empresaId, user.id, clave, dto.activo);
  }
}
