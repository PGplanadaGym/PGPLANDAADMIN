import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTipoCitaDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  duracionMinutos!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  bufferMinutos?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precio?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;
}
