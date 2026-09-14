import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';

export const ESTADOS_ACTIVO = ['disponible', 'asignado', 'baja'] as const;

export class UpdateActivoDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoriaActivoId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  modelo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  codigoInterno?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  numeroSerie?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  valorCompra?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  fechaCompra?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  garantiaHasta?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sucursalId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imagenUrl?: string;

  @ApiProperty({ required: false, enum: ESTADOS_ACTIVO })
  @IsOptional()
  @IsIn(ESTADOS_ACTIVO)
  estado?: (typeof ESTADOS_ACTIVO)[number];
}
