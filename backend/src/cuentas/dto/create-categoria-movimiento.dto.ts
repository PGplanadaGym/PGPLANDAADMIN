import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export const TIPOS_MOVIMIENTO_CUENTA = ['ingreso', 'egreso'] as const;

export class CreateCategoriaMovimientoDto {
  @ApiProperty({ enum: TIPOS_MOVIMIENTO_CUENTA })
  @IsIn(TIPOS_MOVIMIENTO_CUENTA)
  tipo!: (typeof TIPOS_MOVIMIENTO_CUENTA)[number];

  @ApiProperty()
  @IsString()
  nombre!: string;
}
