import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class LineaMaterialDto {
  @ApiProperty()
  @IsString()
  materialId!: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  cantidad!: number;

  @ApiProperty({ description: 'Precio unitario del material al momento de agregarlo a esta parte' })
  @IsNumber()
  @Min(0)
  precioUnitarioSnapshot!: number;
}

export class ParteCosteoDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  horas!: number;

  @ApiProperty({ type: [LineaMaterialDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineaMaterialDto)
  materiales!: LineaMaterialDto[];
}

export class GuardarCosteoDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clienteId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  tarifaHora!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  margenPorcentaje?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  otrosCostos?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ type: [ParteCosteoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParteCosteoDto)
  partes!: ParteCosteoDto[];
}
