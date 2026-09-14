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
import { ActivosService } from './activos.service';
import { CreateCategoriaActivoDto } from './dto/create-categoria-activo.dto';
import { UpdateCategoriaActivoDto } from './dto/update-categoria-activo.dto';

@ApiTags('categorias-activo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('categorias-activo')
export class CategoriasActivoController {
  constructor(private readonly activosService: ActivosService) {}

  @CheckPermissions('activos.leer')
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    return this.activosService.findAllCategorias(user.empresaId, incluirInactivos === 'true');
  }

  @CheckPermissions('activos.crear')
  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCategoriaActivoDto,
  ) {
    return this.activosService.createCategoria(user.empresaId, dto);
  }

  @CheckPermissions('activos.actualizar')
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoriaActivoDto,
  ) {
    return this.activosService.updateCategoria(user.empresaId, id, dto);
  }

  @CheckPermissions('activos.actualizar')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.activosService.removeCategoria(user.empresaId, id);
  }
}
