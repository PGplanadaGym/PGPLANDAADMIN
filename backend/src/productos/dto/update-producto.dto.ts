import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateProductoDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoriaId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  precio?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  costo?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  unidadMedida?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  stockMinimo?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imagenUrl?: string;
}
