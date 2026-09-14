import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsLatitude, IsLongitude, IsNumber, IsOptional } from 'class-validator';

export const TIPOS_MARCACION = ['entrada', 'salida', 'inicio_comida', 'fin_comida'] as const;

export class MarcarAsistenciaDto {
  @ApiProperty({ enum: TIPOS_MARCACION })
  @IsIn(TIPOS_MARCACION)
  tipo!: (typeof TIPOS_MARCACION)[number];

  @ApiProperty({ required: false, description: 'Latitud GPS capturada por el navegador' })
  @IsOptional()
  @IsLatitude()
  latitud?: number;

  @ApiProperty({ required: false, description: 'Longitud GPS capturada por el navegador' })
  @IsOptional()
  @IsLongitude()
  longitud?: number;

  @ApiProperty({ required: false, description: 'Precisión del GPS en metros' })
  @IsOptional()
  @IsNumber()
  precision?: number;
}
