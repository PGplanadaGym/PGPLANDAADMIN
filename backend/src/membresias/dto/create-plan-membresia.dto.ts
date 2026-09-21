import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreatePlanMembresiaDto {
  @ApiProperty()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  nombre!: string;

  @ApiProperty({ description: 'Duración del plan en días, ej: 30, 90, 365' })
  @IsInt()
  @Min(1)
  duracionDias!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  precio!: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
