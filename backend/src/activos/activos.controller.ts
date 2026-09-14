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
import { CheckPermissions } from '../common/decorators/permissions.decorator';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { ActivosService } from './activos.service';
import { CreateActivoDto } from './dto/create-activo.dto';
import { UpdateActivoDto } from './dto/update-activo.dto';
import { AsignarActivoDto } from './dto/asignar-activo.dto';
import { AsignarVariosActivosDto } from './dto/asignar-varios-activos.dto';
import { DevolverActivoDto } from './dto/devolver-activo.dto';
import { DevolverTodosActivosDto } from './dto/devolver-todos-activos.dto';
import { ReemplazarActivoDto } from './dto/reemplazar-activo.dto';
import { CreateMantenimientoDto } from './dto/create-mantenimiento.dto';

@ApiTags('activos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('activos')
export class ActivosController {
  constructor(private readonly activosService: ActivosService) {}

  @CheckPermissions('activos.leer')
  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.activosService.findAllActivos(user.empresaId);
  }

  @CheckPermissions('activos.leer')
  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.activosService.findOneActivo(user.empresaId, id);
  }

  @CheckPermissions('activos.leer')
  @Get(':id/historial')
  historial(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.activosService.findHistorial(user.empresaId, id);
  }

  @CheckPermissions('activos.crear')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateActivoDto) {
    return this.activosService.createActivo(user.empresaId, user.id, dto);
  }

  @CheckPermissions('activos.actualizar')
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateActivoDto,
  ) {
    return this.activosService.update(user.empresaId, user.id, id, dto);
  }

  @CheckPermissions('activos.eliminar')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.activosService.remove(user.empresaId, user.id, id);
  }

  @CheckPermissions('activos.leer')
  @Get(':id/mantenimientos')
  mantenimientos(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.activosService.findMantenimientos(user.empresaId, id);
  }

  @CheckPermissions('activos.actualizar')
  @Post(':id/mantenimientos')
  crearMantenimiento(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CreateMantenimientoDto,
  ) {
    return this.activosService.crearMantenimiento(user.empresaId, user.id, id, dto);
  }

  @CheckPermissions('activos.actualizar')
  @Delete(':id/mantenimientos/:mantenimientoId')
  eliminarMantenimiento(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('mantenimientoId') mantenimientoId: string,
  ) {
    return this.activosService.eliminarMantenimiento(user.empresaId, id, mantenimientoId);
  }

  @CheckPermissions('activos.asignar')
  @Post(':id/asignar')
  asignar(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AsignarActivoDto,
  ) {
    return this.activosService.asignar(user.empresaId, user.id, id, dto);
  }

  @CheckPermissions('activos.asignar')
  @Post('asignar-varios')
  asignarVarios(@CurrentUser() user: RequestUser, @Body() dto: AsignarVariosActivosDto) {
    return this.activosService.asignarVarios(user.empresaId, user.id, dto);
  }

  @CheckPermissions('activos.asignar')
  @Post(':id/devolver')
  devolver(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: DevolverActivoDto,
  ) {
    return this.activosService.devolver(user.empresaId, user.id, id, dto);
  }

  @CheckPermissions('activos.asignar')
  @Post('devolver-todos')
  devolverTodos(@CurrentUser() user: RequestUser, @Body() dto: DevolverTodosActivosDto) {
    return this.activosService.devolverTodos(user.empresaId, user.id, dto);
  }

  @CheckPermissions('activos.asignar')
  @Post(':id/reemplazar')
  reemplazar(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReemplazarActivoDto,
  ) {
    return this.activosService.reemplazar(user.empresaId, user.id, id, dto);
  }
}
