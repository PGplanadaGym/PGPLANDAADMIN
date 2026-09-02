import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { VentasService } from './ventas.service';
import { CreateOrdenDto } from './dto/create-orden.dto';

@ApiTags('ventas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuloActivoGuard)
@RequiereModulo('ventas')
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @CheckPermissions('ventas.leer')
  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.ventasService.findAll(user.empresaId);
  }

  @CheckPermissions('ventas.leer')
  @Get('top-productos')
  topProductos(
    @CurrentUser() user: RequestUser,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.ventasService.topProductos(user.empresaId, desde, hasta);
  }

  @CheckPermissions('ventas.leer')
  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ventasService.findOne(user.empresaId, id);
  }

  @CheckPermissions('ventas.crear')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateOrdenDto) {
    return this.ventasService.create(user.empresaId, user.id, dto);
  }

  @CheckPermissions('ventas.eliminar')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ventasService.remove(user.empresaId, user.id, id);
  }
}
