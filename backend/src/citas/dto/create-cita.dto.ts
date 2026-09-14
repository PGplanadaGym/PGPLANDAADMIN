import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateCitaDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clienteId?: string;

  @ApiProperty()
  @IsString()
  recursoId!: string;

  @ApiProperty()
  @IsString()
  tipoCitaId!: string;

  @ApiProperty()
  @IsISO8601()
  fechaInicio!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  fechaFin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;
}
