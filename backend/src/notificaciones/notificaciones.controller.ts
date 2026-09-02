import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { NotificacionesService } from './notificaciones.service';

@ApiTags('notificaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get()
  findMias(
    @CurrentUser() user: RequestUser,
    @Query('noLeidas') noLeidas?: string,
  ) {
    return this.notificacionesService.findMias(
      user.empresaId,
      user.id,
      noLeidas === 'true',
    );
  }

  @Get('no-leidas/contador')
  contarNoLeidas(@CurrentUser() user: RequestUser) {
    return this.notificacionesService.contarNoLeidas(user.empresaId, user.id);
  }

  @Patch(':id/leida')
  marcarLeida(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.notificacionesService.marcarLeida(user.empresaId, user.id, id);
  }

  @Patch('leer-todas')
  marcarTodasLeidas(@CurrentUser() user: RequestUser) {
    return this.notificacionesService.marcarTodasLeidas(
      user.empresaId,
      user.id,
    );
  }
}
