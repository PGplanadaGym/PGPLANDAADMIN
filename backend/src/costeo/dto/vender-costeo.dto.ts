import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class VenderCosteoDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  precioVenta!: number;

  @ApiProperty({ description: 'Categoría de ingreso para registrar la venta' })
  @IsString()
  categoriaId!: string;

  @ApiProperty({
    required: false,
    description:
      'Categoría de egreso para registrar el costo real (materiales + otros costos, sin mano de obra). Requerida si ese costo es mayor a 0.',
  })
  @IsOptional()
  @IsString()
  categoriaEgresoId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  fecha?: string;
}
