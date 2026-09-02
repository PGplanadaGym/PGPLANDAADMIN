import {
  Body,
  Controller,
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
import { SucursalesService } from './sucursales.service';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';

@ApiTags('sucursales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuloActivoGuard)
@RequiereModulo('sucursales')
@Controller('sucursales')
export class SucursalesController {
  constructor(private readonly sucursalesService: SucursalesService) {}

  @CheckPermissions('sucursales.leer')
  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.sucursalesService.findAll(user.empresaId);
  }

  @CheckPermissions('sucursales.crear')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateSucursalDto) {
    return this.sucursalesService.create(user.empresaId, dto);
  }

  @CheckPermissions('sucursales.actualizar')
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateSucursalDto,
  ) {
    return this.sucursalesService.update(user.empresaId, id, dto);
  }
}
