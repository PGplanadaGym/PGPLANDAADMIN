import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrdenCompraItemDto {
  @ApiProperty()
  @IsString()
  productoId!: string;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  cantidad!: number;

  @ApiProperty({
    description: 'Costo unitario de compra (puede diferir del precio de venta)',
  })
  @IsNumber()
  @Min(0)
  precioUnit!: number;
}

export class CreateOrdenCompraDto {
  @ApiProperty()
  @IsString()
  proveedorId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ required: false, description: 'Fecha esperada de entrega' })
  @IsOptional()
  @IsISO8601()
  fechaEsperada?: string;

  @ApiProperty({ type: [OrdenCompraItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrdenCompraItemDto)
  items!: OrdenCompraItemDto[];
}
