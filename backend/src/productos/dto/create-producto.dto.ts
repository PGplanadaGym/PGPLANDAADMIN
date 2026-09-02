import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProductoDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty()
  @IsNumber()
  precio!: number;

  @ApiProperty({ required: false, default: 'unidad' })
  @IsOptional()
  @IsString()
  unidadMedida?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  stockMinimo?: number;
}
