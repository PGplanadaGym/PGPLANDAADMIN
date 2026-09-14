import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class UpdateCitaDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clienteId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  recursoId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tipoCitaId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  fechaInicio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  fechaFin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;
}
