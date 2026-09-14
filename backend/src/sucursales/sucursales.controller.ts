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
import { SucursalesService } from './sucursales.service';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';

@ApiTags('sucursales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sucursales')
export class SucursalesController {
  constructor(private readonly sucursalesService: SucursalesService) {}

  @CheckPermissions('sucursales.leer')
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('incluirInactivas') incluirInactivas?: string,
  ) {
    return this.sucursalesService.findAll(user.empresaId, incluirInactivas === 'true');
  }

  @CheckPermissions('sucursales.crear')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateSucursalDto) {
    return this.sucursalesService.create(user.empresaId, dto);
  }

  @CheckPermissions('sucursales.leer')
  @Get(':id/perfil')
  findPerfilSucursal(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.sucursalesService.findPerfilSucursal(user.empresaId, id);
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

  @CheckPermissions('sucursales.actualizar')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.sucursalesService.remove(user.empresaId, id);
  }
}
