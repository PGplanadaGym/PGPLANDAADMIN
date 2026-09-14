import { PartialType } from '@nestjs/swagger';
import { CreateEntidadDinamicaDto } from './create-entidad-dinamica.dto';

/** `clave` se acepta pero se ignora en el service: es el identificador y no se puede reasignar. */
export class UpdateEntidadDinamicaDto extends PartialType(CreateEntidadDinamicaDto) {}
