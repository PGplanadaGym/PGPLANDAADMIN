import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CheckPermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { MedicionesService } from './mediciones.service';
import { CreateMedicionDto } from './dto/create-medicion.dto';
import { UpdateMedicionDto } from './dto/update-medicion.dto';

@ApiTags('mediciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('mediciones')
export class MedicionesController {
  constructor(private readonly medicionesService: MedicionesService) {}

  @CheckPermissions('mediciones.leer')
  @Get()
  findAllPorCliente(@CurrentUser() user: RequestUser, @Query('clienteId') clienteId: string) {
    return this.medicionesService.findAllPorCliente(user.empresaId, clienteId);
  }

  @CheckPermissions('mediciones.crear')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateMedicionDto) {
    return this.medicionesService.create(user.empresaId, user.id, dto);
  }

  @CheckPermissions('mediciones.actualizar')
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateMedicionDto,
  ) {
    return this.medicionesService.update(user.empresaId, id, dto);
  }

  @CheckPermissions('mediciones.eliminar')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.medicionesService.remove(user.empresaId, id);
  }
}
