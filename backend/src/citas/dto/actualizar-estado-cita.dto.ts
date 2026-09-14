import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export const ESTADOS_CITA = [
  'pendiente',
  'confirmada',
  'cancelada',
  'completada',
  'no_asistio',
] as const;

export class ActualizarEstadoCitaDto {
  @ApiProperty({ enum: ESTADOS_CITA })
  @IsIn(ESTADOS_CITA)
  estado!: (typeof ESTADOS_CITA)[number];

  @ApiProperty({
    required: false,
    description: 'Si se envía junto con estado "completada", registra el cobro en Cuentas',
  })
  @IsOptional()
  @IsString()
  categoriaIngresoId?: string;

  @ApiProperty({ required: false, description: 'Si se omite, se usa el precio del tipo de cita' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monto?: number;
}
