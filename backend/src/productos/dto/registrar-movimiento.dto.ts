import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export const TIPOS_MOVIMIENTO = ['entrada', 'salida', 'ajuste'] as const;

export class RegistrarMovimientoDto {
  @ApiProperty({ enum: TIPOS_MOVIMIENTO })
  @IsIn(TIPOS_MOVIMIENTO)
  tipo!: (typeof TIPOS_MOVIMIENTO)[number];

  @ApiProperty({
    description:
      'Para "entrada"/"salida" es la cantidad a mover. Para "ajuste" es el nuevo stock exacto (corrección de conteo físico).',
  })
  @IsInt()
  @Min(0)
  cantidad!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  motivo?: string;

  @ApiProperty({ required: false, description: 'Sucursal donde ocurre el movimiento' })
  @IsOptional()
  @IsString()
  sucursalId?: string;
}
