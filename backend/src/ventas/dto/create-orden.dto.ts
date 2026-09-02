import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class OrdenItemDto {
  @ApiProperty()
  @IsString()
  productoId!: string;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  cantidad!: number;
}

export class CreateOrdenDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clienteId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ type: [OrdenItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrdenItemDto)
  items!: OrdenItemDto[];

  @ApiProperty({
    required: false,
    description:
      'Categoría de ingreso para registrar la venta en Cuentas (si el módulo está activo)',
  })
  @IsOptional()
  @IsString()
  categoriaIngresoId?: string;
}
