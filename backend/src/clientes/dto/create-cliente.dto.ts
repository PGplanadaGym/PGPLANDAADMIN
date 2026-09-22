import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { MENSAJE_CELULAR_INVALIDO, REGEX_CELULAR } from '../../common/validators/celular';
import { MENSAJE_NOMBRE_INVALIDO, REGEX_NOMBRE_PERSONA } from '../../common/validators/nombre-persona';

export class CreateClienteDto {
  @ApiProperty()
  @IsString()
  @MinLength(2, { message: 'Los nombres deben tener al menos 2 caracteres' })
  @Matches(REGEX_NOMBRE_PERSONA, { message: MENSAJE_NOMBRE_INVALIDO })
  nombres!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2, { message: 'Los apellidos deben tener al menos 2 caracteres' })
  @Matches(REGEX_NOMBRE_PERSONA, { message: MENSAJE_NOMBRE_INVALIDO })
  apellidos!: string;

  @ApiProperty({
    description:
      'Sucursal a la que pertenece el cliente. Si quien crea no puede ver todas las sucursales, se ignora y se usa la suya.',
  })
  @IsString()
  @IsNotEmpty()
  sucursalId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(REGEX_CELULAR, { message: MENSAJE_CELULAR_INVALIDO })
  telefono?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  etiqueta?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fotoUrl?: string;

  @ApiProperty({ required: false, enum: ['M', 'F'] })
  @IsOptional()
  @IsIn(['M', 'F'])
  sexo?: string;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  atributosExtra?: Record<string, unknown>;
}
