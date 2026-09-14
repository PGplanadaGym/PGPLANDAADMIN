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
import { ModuloActivoGuard } from '../common/guards/modulo-activo.guard';
import { CheckPermissions } from '../common/decorators/permissions.decorator';
import { RequiereModulo } from '../common/decorators/requiere-modulo.decorator';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { PlanesMembresiaService } from './planes-membresia.service';
import { CreatePlanMembresiaDto } from './dto/create-plan-membresia.dto';
import { UpdatePlanMembresiaDto } from './dto/update-plan-membresia.dto';

@ApiTags('planes-membresia')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuloActivoGuard)
@RequiereModulo('membresias')
@Controller('planes-membresia')
export class PlanesMembresiaController {
  constructor(private readonly planesMembresiaService: PlanesMembresiaService) {}

  @CheckPermissions('membresias.leer')
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    return this.planesMembresiaService.findAll(user.empresaId, incluirInactivos === 'true');
  }

  @CheckPermissions('membresias.actualizar')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePlanMembresiaDto) {
    return this.planesMembresiaService.create(user.empresaId, dto);
  }

  @CheckPermissions('membresias.actualizar')
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdatePlanMembresiaDto,
  ) {
    return this.planesMembresiaService.update(user.empresaId, id, dto);
  }

  @CheckPermissions('membresias.actualizar')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.planesMembresiaService.remove(user.empresaId, id);
  }
}
