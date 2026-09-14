import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { CuentasService } from './cuentas.service';
import { CreateCategoriaMovimientoDto } from './dto/create-categoria-movimiento.dto';
import { CreateMovimientoCuentaDto } from './dto/create-movimiento-cuenta.dto';
import { UpdateMovimientoCuentaDto } from './dto/update-movimiento-cuenta.dto';

@ApiTags('cuentas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class CuentasController {
  constructor(private readonly cuentasService: CuentasService) {}

  @CheckPermissions('cuentas.leer')
  @Get('categorias-movimiento')
  findAllCategorias(@CurrentUser() user: RequestUser, @Query('tipo') tipo?: string) {
    return this.cuentasService.findAllCategorias(user.empresaId, tipo);
  }

  @CheckPermissions('cuentas.crear')
  @Post('categorias-movimiento')
  createCategoria(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCategoriaMovimientoDto,
  ) {
    return this.cuentasService.createCategoria(user.empresaId, dto);
  }

  @CheckPermissions('cuentas.leer')
  @Get('cuentas/resumen')
  resumen(
    @CurrentUser() user: RequestUser,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.cuentasService.resumen(user.empresaId, desde, hasta);
  }

  @CheckPermissions('cuentas.leer')
  @Get('cuentas')
  findAllMovimientos(
    @CurrentUser() user: RequestUser,
    @Query('tipo') tipo?: string,
    @Query('categoriaId') categoriaId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.cuentasService.findAllMovimientos(user.empresaId, {
      tipo,
      categoriaId,
      desde,
      hasta,
    });
  }

  @CheckPermissions('cuentas.leer')
  @Get('cuentas/:id')
  findOneMovimiento(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.cuentasService.findOneMovimiento(user.empresaId, id);
  }

  @CheckPermissions('cuentas.crear')
  @Post('cuentas')
  createMovimiento(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateMovimientoCuentaDto,
  ) {
    return this.cuentasService.createMovimiento(user.empresaId, user.id, dto);
  }

  @CheckPermissions('cuentas.actualizar')
  @Patch('cuentas/:id')
  updateMovimiento(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateMovimientoCuentaDto,
  ) {
    return this.cuentasService.updateMovimiento(user.empresaId, user.id, id, dto);
  }

  @CheckPermissions('cuentas.eliminar')
  @Delete('cuentas/:id')
  removeMovimiento(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.cuentasService.removeMovimiento(user.empresaId, user.id, id);
  }
}
