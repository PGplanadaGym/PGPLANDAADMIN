import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { NominaService } from './nomina.service';
import { CreatePagoNominaDto } from './dto/create-pago-nomina.dto';

@ApiTags('nomina')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuloActivoGuard)
@RequiereModulo('nomina')
@Controller('nomina')
export class NominaController {
  constructor(private readonly nominaService: NominaService) {}

  @CheckPermissions('nomina.leer')
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('periodo') periodo?: string,
  ) {
    return this.nominaService.findAll(user.empresaId, periodo);
  }

  @CheckPermissions('nomina.leer')
  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.nominaService.findOne(user.empresaId, id);
  }

  @CheckPermissions('nomina.crear')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePagoNominaDto) {
    return this.nominaService.create(user.empresaId, user.id, dto);
  }

  @CheckPermissions('nomina.eliminar')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.nominaService.remove(user.empresaId, user.id, id);
  }
}
