import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class RecibirItemDto {
  @ApiProperty()
  @IsString()
  ordenCompraItemId!: string;

  @ApiProperty({ description: 'Cantidad a recibir ahora (puede ser menor a lo pendiente)' })
  @IsInt()
  @IsPositive()
  cantidad!: number;
}

export class RecibirOrdenCompraDto {
  @ApiProperty({
    required: false,
    description:
      'Categoría de egreso para registrar la compra en Cuentas (si el módulo está activo)',
  })
  @IsOptional()
  @IsString()
  categoriaEgresoId?: string;

  @ApiProperty({
    required: false,
    type: [RecibirItemDto],
    description:
      'Cantidades a recibir por item. Si se omite, se recibe todo lo que falta de cada item.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecibirItemDto)
  items?: RecibirItemDto[];
}
