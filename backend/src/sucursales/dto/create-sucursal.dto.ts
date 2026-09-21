import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { MENSAJE_TELEFONO_INVALIDO, REGEX_TELEFONO } from '../../common/validators/telefono';

export class CreateSucursalDto {
  @ApiProperty()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  nombre!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiProperty({
    required: false,
    description: 'Código de establecimiento SRI (3 dígitos, ej. "001")',
  })
  @IsOptional()
  @Matches(/^\d{3}$/, { message: 'El código de establecimiento debe ser de 3 dígitos (ej. 001)' })
  codigoEstablecimiento?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(REGEX_TELEFONO, { message: MENSAJE_TELEFONO_INVALIDO })
  telefono?: string;

  @ApiProperty({ required: false, description: 'Usuario responsable de la sucursal' })
  @IsOptional()
  @IsString()
  encargadoId?: string;

  @ApiProperty({ required: false, description: 'Ej: "Lun-Vie 9:00-18:00"' })
  @IsOptional()
  @IsString()
  horarioAtencion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imagenUrl?: string;
}
