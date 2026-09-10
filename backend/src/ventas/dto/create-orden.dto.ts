import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  metodoPago?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  numeroComprobante?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comprobanteUrl?: string;

  @ApiProperty({
    required: false,
    description: 'Monto fijo a descontar del subtotal (calculado por el cliente, % o $)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento?: number;

  @ApiProperty({
    required: false,
    description:
      'true = guarda la venta "en espera" (no descuenta stock ni registra ingreso hasta confirmarla)',
  })
  @IsOptional()
  @IsBoolean()
  enEspera?: boolean;
}
