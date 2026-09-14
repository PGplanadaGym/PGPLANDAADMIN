import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export const TIPOS_PRODUCTO_SERVICIO = ['producto', 'servicio'] as const;

export class CreateProductoDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty({
    required: false,
    enum: TIPOS_PRODUCTO_SERVICIO,
    default: 'producto',
    description: 'Un "servicio" no maneja stock (ej. mano de obra, instalación, consultoría)',
  })
  @IsOptional()
  @IsIn(TIPOS_PRODUCTO_SERVICIO)
  tipo?: (typeof TIPOS_PRODUCTO_SERVICIO)[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoriaId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty()
  @IsNumber()
  precio!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  costo?: number;

  @ApiProperty({ required: false, default: 'unidad' })
  @IsOptional()
  @IsString()
  unidadMedida?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  stockMinimo?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imagenUrl?: string;
}
