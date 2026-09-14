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
import { RecursosService } from './recursos.service';
import { CreateRecursoDto } from './dto/create-recurso.dto';
import { UpdateRecursoDto } from './dto/update-recurso.dto';
import { SetHorariosDto } from './dto/horario.dto';
import { CreateBloqueoDto } from './dto/bloqueo.dto';
import { SetTiposCitaDto } from './dto/set-tipos-cita.dto';

@ApiTags('recursos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('recursos')
export class RecursosController {
  constructor(private readonly recursosService: RecursosService) {}

  @CheckPermissions('recursos.leer')
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    return this.recursosService.findAll(user.empresaId, incluirInactivos === 'true');
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

  @CheckPermissions('recursos.actualizar')
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateRecursoDto,
  ) {
    return this.recursosService.update(user.empresaId, user.id, id, dto);
  }

  @CheckPermissions('recursos.actualizar')
  @Post(':id/horarios')
  setHorarios(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SetHorariosDto,
  ) {
    return this.recursosService.setHorarios(user.empresaId, id, dto);
  }

  @CheckPermissions('recursos.actualizar')
  @Post(':id/tipos-cita')
  setTiposCita(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SetTiposCitaDto,
  ) {
    return this.recursosService.setTiposCita(user.empresaId, id, dto);
  }

  @CheckPermissions('recursos.actualizar')
  @Post(':id/bloqueos')
  crearBloqueo(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CreateBloqueoDto,
  ) {
    return this.recursosService.crearBloqueo(user.empresaId, id, dto);
  }

  @CheckPermissions('recursos.actualizar')
  @Delete(':id/bloqueos/:bloqueoId')
  eliminarBloqueo(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('bloqueoId') bloqueoId: string,
  ) {
    return this.recursosService.eliminarBloqueo(user.empresaId, id, bloqueoId);
  }
}
