import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMantenimientoDto {
  @ApiProperty()
  @IsISO8601()
  fecha!: string;

  @ApiProperty()
  @IsString()
  descripcion!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  costo?: number;

  @ApiProperty({
    required: false,
    description: 'Si se envía junto con costo, registra el gasto en Cuentas',
  })
  @IsOptional()
  @IsString()
  categoriaEgresoId?: string;
}
