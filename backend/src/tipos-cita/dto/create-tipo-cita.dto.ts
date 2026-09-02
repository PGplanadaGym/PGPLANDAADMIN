import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTipoCitaDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

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
  @IsString()
  color?: string;
}
