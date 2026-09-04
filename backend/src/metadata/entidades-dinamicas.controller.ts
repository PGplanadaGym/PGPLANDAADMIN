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
import { EntidadesDinamicasService } from './entidades-dinamicas.service';
import { CreateEntidadDinamicaDto } from './dto/create-entidad-dinamica.dto';
import { UpdateEntidadDinamicaDto } from './dto/update-entidad-dinamica.dto';

@ApiTags('entidades-dinamicas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('entidades-dinamicas')
export class EntidadesDinamicasController {
  constructor(
    private readonly entidadesDinamicasService: EntidadesDinamicasService,
  ) {}

  @CheckPermissions('entidades.leer')
  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.entidadesDinamicasService.findAll(user.empresaId);
  }

  @CheckPermissions('entidades.crear')
  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateEntidadDinamicaDto,
  ) {
    return this.entidadesDinamicasService.create(user.empresaId, user.id, dto);
  }

  @CheckPermissions('entidades.actualizar')
  @Patch(':clave')
  update(
    @CurrentUser() user: RequestUser,
    @Param('clave') clave: string,
    @Body() dto: UpdateEntidadDinamicaDto,
  ) {
    return this.entidadesDinamicasService.update(user.empresaId, user.id, clave, dto);
  }

  @CheckPermissions('entidades.eliminar')
  @Delete(':clave')
  remove(@CurrentUser() user: RequestUser, @Param('clave') clave: string) {
    return this.entidadesDinamicasService.remove(user.empresaId, user.id, clave);
  }
}
