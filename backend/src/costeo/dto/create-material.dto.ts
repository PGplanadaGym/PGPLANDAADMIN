import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateMaterialDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty({ required: false, description: 'Ej: Estándar, Premium, Lujo' })
  @IsOptional()
  @IsString()
  calidad?: string;

  @ApiProperty({ description: 'Ej: metro, kg, unidad, litro, pliego' })
  @IsString()
  unidadMedida!: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  precioUnitario!: number;
}
