import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { RecibirOrdenCompraDto } from './dto/recibir-orden-compra.dto';

@ApiTags('proveedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuloActivoGuard)
@RequiereModulo('compras')
@Controller()
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @CheckPermissions('proveedores.leer')
  @Get('proveedores')
  findAllProveedores(@CurrentUser() user: RequestUser) {
    return this.proveedoresService.findAllProveedores(user.empresaId);
  }

  @CheckPermissions('proveedores.crear')
  @Post('proveedores')
  createProveedor(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateProveedorDto,
  ) {
    return this.proveedoresService.createProveedor(user.empresaId, dto);
  }

  @CheckPermissions('proveedores.actualizar')
  @Patch('proveedores/:id')
  updateProveedor(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateProveedorDto,
  ) {
    return this.proveedoresService.updateProveedor(user.empresaId, id, dto);
  }

  @CheckPermissions('compras.leer')
  @Get('ordenes-compra')
  findAllOrdenesCompra(@CurrentUser() user: RequestUser) {
    return this.proveedoresService.findAllOrdenesCompra(user.empresaId);
  }

  @CheckPermissions('compras.leer')
  @Get('ordenes-compra/:id')
  findOneOrdenCompra(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.proveedoresService.findOneOrdenCompra(user.empresaId, id);
  }

  @CheckPermissions('compras.crear')
  @Post('ordenes-compra')
  createOrdenCompra(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateOrdenCompraDto,
  ) {
    return this.proveedoresService.createOrdenCompra(
      user.empresaId,
      user.id,
      dto,
    );
  }

  @CheckPermissions('compras.actualizar')
  @Post('ordenes-compra/:id/recibir')
  recibirOrdenCompra(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: RecibirOrdenCompraDto,
  ) {
    return this.proveedoresService.recibirOrdenCompra(
      user.empresaId,
      user.id,
      id,
      dto,
    );
  }

  @CheckPermissions('compras.eliminar')
  @Delete('ordenes-compra/:id')
  removeOrdenCompra(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.proveedoresService.removeOrdenCompra(
      user.empresaId,
      user.id,
      id,
    );
  }
}
