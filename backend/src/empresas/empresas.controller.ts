import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
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
import { EmpresasService } from './empresas.service';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@ApiTags('empresas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @CheckPermissions('empresas.leer')
  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    if (id !== user.empresaId) {
      throw new ForbiddenException('No puedes ver otra empresa que no sea la tuya');
    }
    return this.empresasService.findOne(id);
  }

  @CheckPermissions('empresas.actualizar')
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmpresaDto,
  ) {
    if (id !== user.empresaId) {
      throw new ForbiddenException('No puedes editar otra empresa que no sea la tuya');
    }
    return this.empresasService.update(id, user.id, dto);
  }
}
