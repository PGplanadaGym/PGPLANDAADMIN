import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

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
}
