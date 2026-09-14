import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
import { CosteoService } from './costeo.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { GuardarCosteoDto } from './dto/guardar-costeo.dto';
import { VenderCosteoDto } from './dto/vender-costeo.dto';

@ApiTags('costeo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuloActivoGuard)
@RequiereModulo('costeo')
@Controller()
export class CosteoController {
  constructor(private readonly costeoService: CosteoService) {}

  @CheckPermissions('costeo.leer')
  @Get('materiales')
  findAllMateriales(@CurrentUser() user: RequestUser) {
    return this.costeoService.findAllMateriales(user.empresaId);
  }

  @CheckPermissions('costeo.crear')
  @Post('materiales')
  createMaterial(@CurrentUser() user: RequestUser, @Body() dto: CreateMaterialDto) {
    return this.costeoService.createMaterial(user.empresaId, dto);
  }

  @CheckPermissions('costeo.leer')
  @Get('costeos')
  findAllProyectos(@CurrentUser() user: RequestUser) {
    return this.costeoService.findAllProyectos(user.empresaId);
  }

  @CheckPermissions('costeo.leer')
  @Get('costeos/:id')
  findOneProyecto(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.costeoService.findOneProyecto(user.empresaId, id);
  }

  @CheckPermissions('costeo.crear')
  @Post('costeos')
  createProyecto(@CurrentUser() user: RequestUser, @Body() dto: GuardarCosteoDto) {
    return this.costeoService.createProyecto(user.empresaId, user.id, dto);
  }

  @CheckPermissions('costeo.actualizar')
  @Patch('costeos/:id')
  updateProyecto(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: GuardarCosteoDto,
  ) {
    return this.costeoService.updateProyecto(user.empresaId, user.id, id, dto);
  }

  @CheckPermissions('costeo.actualizar')
  @Post('costeos/:id/vender')
  vender(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: VenderCosteoDto,
  ) {
    return this.costeoService.vender(user.empresaId, user.id, id, dto);
  }

  @CheckPermissions('costeo.actualizar')
  @Post('costeos/:id/deshacer-venta')
  deshacerVenta(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.costeoService.deshacerVenta(user.empresaId, user.id, id);
  }

  @CheckPermissions('costeo.eliminar')
  @Delete('costeos/:id')
  removeProyecto(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.costeoService.removeProyecto(user.empresaId, user.id, id);
  }
}
