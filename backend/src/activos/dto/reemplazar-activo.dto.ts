import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export const ESTADOS_ACTIVO_REEMPLAZADO = ['disponible', 'baja'] as const;

export class ReemplazarActivoDto {
  @ApiProperty({ description: 'Activo disponible que reemplaza al actual' })
  @IsString()
  activoNuevoId!: string;

  @ApiProperty({
    required: false,
    description: 'Motivo del reemplazo (daño, robo, actualización, etc.)',
  })
  @IsOptional()
  @IsString()
  motivo?: string;

  @ApiProperty({
    required: false,
    enum: ESTADOS_ACTIVO_REEMPLAZADO,
    description:
      'Qué pasa con el activo reemplazado: vuelve a "disponible" (por defecto) o se marca "baja" si quedó inservible',
  })
  @IsOptional()
  @IsIn(ESTADOS_ACTIVO_REEMPLAZADO)
  estadoActivoViejo?: (typeof ESTADOS_ACTIVO_REEMPLAZADO)[number];
}
