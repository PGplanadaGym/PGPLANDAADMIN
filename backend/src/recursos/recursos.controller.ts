import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
import { RecursosService } from './recursos.service';
import { CreateRecursoDto } from './dto/create-recurso.dto';
import { SetHorariosDto } from './dto/horario.dto';

@ApiTags('recursos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuloActivoGuard)
@RequiereModulo('citas')
@Controller('recursos')
export class RecursosController {
  constructor(private readonly recursosService: RecursosService) {}

  @CheckPermissions('recursos.leer')
  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.recursosService.findAll(user.empresaId);
  }

  @CheckPermissions('recursos.leer')
  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.recursosService.findOne(user.empresaId, id);
  }

  @CheckPermissions('recursos.crear')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRecursoDto) {
    return this.recursosService.create(user.empresaId, user.id, dto);
  }

  @CheckPermissions('recursos.crear')
  @Post(':id/horarios')
  setHorarios(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SetHorariosDto,
  ) {
    return this.recursosService.setHorarios(user.empresaId, id, dto);
  }
}
