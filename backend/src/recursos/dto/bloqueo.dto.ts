import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateBloqueoDto {
  @ApiProperty({ description: 'Fecha del bloqueo (YYYY-MM-DD)' })
  @IsDateString()
  fecha!: string;

  @ApiProperty({ required: false, description: 'Si se omite junto con horaFin, bloquea el día completo' })
  @IsOptional()
  @IsString()
  horaInicio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  horaFin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  motivo?: string;
}
