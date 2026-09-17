import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateMedicionDto {
  @ApiProperty()
  @IsUUID()
  clienteId!: string;

  @ApiProperty()
  @IsDateString()
  fecha!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  peso!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  talla!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  perimetroCuello?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  perimetroCintura?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  perimetroCadera?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  perimetroPecho?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  masaMuscular?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;
}
