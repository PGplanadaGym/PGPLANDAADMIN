import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { EntidadesDinamicasService } from './entidades-dinamicas.service';

@ApiTags('meta')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meta')
export class MetaController {
  constructor(
    private readonly entidadesDinamicasService: EntidadesDinamicasService,
  ) {}

  @Get('entidades')
  async entidades(@CurrentUser() user: RequestUser) {
    const entidades = await this.entidadesDinamicasService.findAll(
      user.empresaId,
    );

    return entidades.map((entidad) => ({
      clave: entidad.clave,
      nombre: entidad.nombre,
      campos: entidad.campos.map((campo) => ({
        clave: campo.clave,
        etiqueta: campo.etiqueta,
        tipo: campo.tipo,
        requerido: campo.requerido,
        opciones: campo.opciones,
        orden: campo.orden,
      })),
    }));
  }
}
