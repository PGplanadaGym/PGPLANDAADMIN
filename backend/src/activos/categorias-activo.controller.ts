import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
import { CreateCategoriaActivoDto } from './dto/create-categoria-activo.dto';

@ApiTags('categorias-activo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuloActivoGuard)
@RequiereModulo('inventario')
@Controller('categorias-activo')
export class CategoriasActivoController {
  constructor(private readonly activosService: ActivosService) {}

  @CheckPermissions('activos.leer')
  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.activosService.findAllCategorias(user.empresaId);
  }

  @CheckPermissions('activos.crear')
  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCategoriaActivoDto,
  ) {
    return this.activosService.createCategoria(user.empresaId, dto);
  }
}
