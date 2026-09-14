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
import { RegistrosDinamicosService } from './registros-dinamicos.service';
import { RegistroValoresDto } from './dto/registro-valores.dto';

@ApiTags('registros-dinamicos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dinamico/:entidadClave/registros')
export class RegistrosDinamicosController {
  constructor(
    private readonly registrosDinamicosService: RegistrosDinamicosService,
  ) {}

  @CheckPermissions('entidades.registros.leer')
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Param('entidadClave') entidadClave: string,
  ) {
    return this.registrosDinamicosService.findAll(user.empresaId, entidadClave);
  }

  @CheckPermissions('entidades.registros.leer')
  @Get(':id')
  findOne(
    @CurrentUser() user: RequestUser,
    @Param('entidadClave') entidadClave: string,
    @Param('id') id: string,
  ) {
    return this.registrosDinamicosService.findOne(
      user.empresaId,
      entidadClave,
      id,
    );
  }

  @CheckPermissions('entidades.registros.crear')
  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Param('entidadClave') entidadClave: string,
    @Body() dto: RegistroValoresDto,
  ) {
    return this.registrosDinamicosService.create(
      user.empresaId,
      user.id,
      entidadClave,
      dto.valores,
    );
  }

  @CheckPermissions('entidades.registros.actualizar')
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('entidadClave') entidadClave: string,
    @Param('id') id: string,
    @Body() dto: RegistroValoresDto,
  ) {
    return this.registrosDinamicosService.update(
      user.empresaId,
      user.id,
      entidadClave,
      id,
      dto.valores,
    );
  }

  @CheckPermissions('entidades.registros.eliminar')
  @Delete(':id')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('entidadClave') entidadClave: string,
    @Param('id') id: string,
  ) {
    return this.registrosDinamicosService.remove(
      user.empresaId,
      user.id,
      entidadClave,
      id,
    );
  }
}
