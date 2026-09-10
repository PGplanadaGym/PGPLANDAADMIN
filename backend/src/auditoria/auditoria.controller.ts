import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CheckPermissions } from '../common/decorators/permissions.decorator';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { AuditoriaService } from './auditoria.service';

@ApiTags('auditoria')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @CheckPermissions('auditoria.leer')
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('antes') antes?: string,
    @Query('take') take?: string,
  ) {
    return this.auditoriaService.findAll(user.empresaId, {
      desde,
      hasta,
      antes,
      take: take ? Number(take) : undefined,
    });
  }

  @CheckPermissions('auditoria.leer')
  @Get('exportar')
  exportar(
    @CurrentUser() user: RequestUser,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.auditoriaService.exportar(user.empresaId, { desde, hasta });
  }
}
