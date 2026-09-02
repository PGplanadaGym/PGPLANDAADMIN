import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateActivoDto {
  @ApiProperty()
  @IsString()
  categoriaActivoId!: string;

  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  codigoInterno?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  numeroSerie?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  valorCompra?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  fechaCompra?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sucursalId?: string;
}
