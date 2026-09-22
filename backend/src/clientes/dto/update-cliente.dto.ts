import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { MENSAJE_CELULAR_INVALIDO, REGEX_CELULAR } from '../../common/validators/celular';
import { MENSAJE_NOMBRE_INVALIDO, REGEX_NOMBRE_PERSONA } from '../../common/validators/nombre-persona';

export class UpdateClienteDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Los nombres deben tener al menos 2 caracteres' })
  @Matches(REGEX_NOMBRE_PERSONA, { message: MENSAJE_NOMBRE_INVALIDO })
  nombres?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Los apellidos deben tener al menos 2 caracteres' })
  @Matches(REGEX_NOMBRE_PERSONA, { message: MENSAJE_NOMBRE_INVALIDO })
  apellidos?: string;

  @ApiProperty({
    required: false,
    description: 'Solo quien puede ver todas las sucursales puede reasignar el cliente a otra.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sucursalId?: string;

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiProperty({
    required: false,
    description: 'Ubicación del cliente en el mapa',
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud?: number;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  atributosExtra?: Record<string, unknown>;
}
