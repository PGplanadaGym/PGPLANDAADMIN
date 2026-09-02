import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export const TIPOS_CAMPO = [
  'texto',
  'numero',
  'fecha',
  'booleano',
  'select',
] as const;

export class CreateCampoDinamicoDto {
  @ApiProperty()
  @IsString()
  clave!: string;

  @ApiProperty()
  @IsString()
  etiqueta!: string;

  @ApiProperty({ enum: TIPOS_CAMPO })
  @IsIn(TIPOS_CAMPO)
  tipo!: (typeof TIPOS_CAMPO)[number];

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  requerido?: boolean;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  opciones?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  orden?: number;
}
