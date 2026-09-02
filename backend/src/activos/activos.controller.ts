import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { ModuloActivoGuard } from '../common/guards/modulo-activo.guard';
import { CheckPermissions } from '../common/decorators/permissions.decorator';
import { RequiereModulo } from '../common/decorators/requiere-modulo.decorator';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { ActivosService } from './activos.service';
import { CreateActivoDto } from './dto/create-activo.dto';
import { AsignarActivoDto } from './dto/asignar-activo.dto';
import { DevolverActivoDto } from './dto/devolver-activo.dto';

@ApiTags('activos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuloActivoGuard)
@RequiereModulo('inventario')
@Controller('activos')
export class ActivosController {
  constructor(private readonly activosService: ActivosService) {}

  @CheckPermissions('activos.leer')
  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.activosService.findAllActivos(user.empresaId);
  }

  @CheckPermissions('activos.leer')
  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.activosService.findOneActivo(user.empresaId, id);
  }

  @CheckPermissions('activos.leer')
  @Get(':id/historial')
  historial(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.activosService.findHistorial(user.empresaId, id);
  }

  @CheckPermissions('activos.crear')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateActivoDto) {
    return this.activosService.createActivo(user.empresaId, user.id, dto);
  }

  @CheckPermissions('activos.asignar')
  @Post(':id/asignar')
  asignar(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AsignarActivoDto,
  ) {
    return this.activosService.asignar(user.empresaId, user.id, id, dto);
  }

  @CheckPermissions('activos.asignar')
  @Post(':id/devolver')
  devolver(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: DevolverActivoDto,
  ) {
    return this.activosService.devolver(user.empresaId, user.id, id, dto);
  }
}
