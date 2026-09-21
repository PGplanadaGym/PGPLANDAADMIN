import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CheckPermissions } from '../common/decorators/permissions.decorator';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { MembresiasService } from './membresias.service';
import { RenovarMembresiaDto } from './dto/renovar-membresia.dto';
import { EditarVencimientoMembresiaDto } from './dto/editar-vencimiento-membresia.dto';

@ApiTags('membresias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('membresias')
export class MembresiasController {
  constructor(private readonly membresiasService: MembresiasService) {}

  @CheckPermissions('membresias.leer')
  @Get()
  findEstado(@CurrentUser() user: RequestUser) {
    return this.membresiasService.findEstadoPorEmpresa(user.empresaId, user.permisos, user.sucursalId);
  }

  @CheckPermissions('membresias.leer')
  @Get('cliente/:clienteId')
  estadoDeCliente(@CurrentUser() user: RequestUser, @Param('clienteId') clienteId: string) {
    return this.membresiasService.estadoDeCliente(
      user.empresaId,
      clienteId,
      user.permisos,
      user.sucursalId,
    );
  }

  @CheckPermissions('membresias.crear')
  @Post(':clienteId/renovar')
  renovar(
    @CurrentUser() user: RequestUser,
    @Param('clienteId') clienteId: string,
    @Body() dto: RenovarMembresiaDto,
  ) {
    return this.membresiasService.renovar(
      user.empresaId,
      user.id,
      clienteId,
      dto,
      user.permisos,
      user.sucursalId,
    );
  }

  @CheckPermissions('membresias.actualizar')
  @Patch(':id/vencimiento')
  editarVencimiento(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: EditarVencimientoMembresiaDto,
  ) {
    return this.membresiasService.editarVencimiento(
      user.empresaId,
      user.id,
      id,
      dto,
      user.permisos,
      user.sucursalId,
    );
  }
}
