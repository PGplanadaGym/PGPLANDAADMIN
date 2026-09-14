import {
  Body,
  Controller,
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
import { ModuloActivoGuard } from '../common/guards/modulo-activo.guard';
import { CheckPermissions } from '../common/decorators/permissions.decorator';
import { RequiereModulo } from '../common/decorators/requiere-modulo.decorator';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';

@ApiTags('productos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuloActivoGuard)
@RequiereModulo('inventario')
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @CheckPermissions('productos.leer')
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    return this.productosService.findAll(user.empresaId, incluirInactivos === 'true');
  }

  @CheckPermissions('productos.leer')
  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.productosService.findOne(user.empresaId, id);
  }

  @CheckPermissions('productos.leer')
  @Get(':id/movimientos')
  movimientos(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.productosService.findMovimientos(user.empresaId, id);
  }

  @CheckPermissions('productos.leer')
  @Get(':id/stock-por-sucursal')
  stockPorSucursal(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.productosService.stockPorSucursal(user.empresaId, id);
  }

  @CheckPermissions('productos.crear')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateProductoDto) {
    return this.productosService.create(user.empresaId, user.id, dto);
  }

  @CheckPermissions('productos.actualizar')
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductoDto,
  ) {
    return this.productosService.update(user.empresaId, user.id, id, dto);
  }

  @CheckPermissions('productos.movimientos.crear')
  @Post(':id/movimientos')
  registrarMovimiento(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: RegistrarMovimientoDto,
  ) {
    return this.productosService.registrarMovimiento(user.empresaId, user.id, id, dto);
  }
}
