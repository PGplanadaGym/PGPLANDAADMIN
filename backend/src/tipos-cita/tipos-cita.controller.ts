import {
  Body,
  Controller,
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
import { TiposCitaService } from './tipos-cita.service';
import { CreateTipoCitaDto } from './dto/create-tipo-cita.dto';
import { UpdateTipoCitaDto } from './dto/update-tipo-cita.dto';

@ApiTags('tipos-cita')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tipos-cita')
export class TiposCitaController {
  constructor(private readonly tiposCitaService: TiposCitaService) {}

  @CheckPermissions('tipos-cita.leer')
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    return this.tiposCitaService.findAll(user.empresaId, incluirInactivos === 'true');
  }

  @CheckPermissions('tipos-cita.leer')
  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.tiposCitaService.findOne(user.empresaId, id);
  }

  @CheckPermissions('tipos-cita.crear')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateTipoCitaDto) {
    return this.tiposCitaService.create(user.empresaId, user.id, dto);
  }

  @CheckPermissions('tipos-cita.actualizar')
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateTipoCitaDto,
  ) {
    return this.tiposCitaService.update(user.empresaId, user.id, id, dto);
  }
}
