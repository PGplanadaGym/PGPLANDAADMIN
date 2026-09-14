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
import { CitasService } from './citas.service';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';
import { ActualizarEstadoCitaDto } from './dto/actualizar-estado-cita.dto';

@ApiTags('citas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('citas')
export class CitasController {
  constructor(private readonly citasService: CitasService) {}

  @CheckPermissions('citas.leer')
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.citasService.findAll(user.empresaId, desde, hasta);
  }

  @CheckPermissions('citas.leer')
  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.citasService.findOne(user.empresaId, id);
  }

  @CheckPermissions('citas.crear')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCitaDto) {
    return this.citasService.create(user.empresaId, user.id, dto);
  }

  @CheckPermissions('citas.actualizar')
  @Patch(':id/estado')
  actualizarEstado(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ActualizarEstadoCitaDto,
  ) {
    return this.citasService.actualizarEstado(user.empresaId, user.id, id, dto);
  }

  @CheckPermissions('citas.actualizar')
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateCitaDto,
  ) {
    return this.citasService.update(user.empresaId, user.id, id, dto);
  }

  @CheckPermissions('citas.eliminar')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.citasService.remove(user.empresaId, user.id, id);
  }
}
