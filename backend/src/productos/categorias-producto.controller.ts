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
import { ProductosService } from './productos.service';
import { CreateCategoriaProductoDto } from './dto/create-categoria-producto.dto';
import { UpdateCategoriaProductoDto } from './dto/update-categoria-producto.dto';

@ApiTags('categorias-producto')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('categorias-producto')
export class CategoriasProductoController {
  constructor(private readonly productosService: ProductosService) {}

  @CheckPermissions('productos.leer')
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    return this.productosService.findAllCategorias(user.empresaId, incluirInactivos === 'true');
  }

  @CheckPermissions('productos.crear')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCategoriaProductoDto) {
    return this.productosService.createCategoria(user.empresaId, dto);
  }

  @CheckPermissions('productos.actualizar')
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoriaProductoDto,
  ) {
    return this.productosService.updateCategoria(user.empresaId, id, dto);
  }

  @CheckPermissions('productos.actualizar')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.productosService.removeCategoria(user.empresaId, id);
  }
}
