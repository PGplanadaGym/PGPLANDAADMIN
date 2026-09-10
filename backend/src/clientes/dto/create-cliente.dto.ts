import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateClienteDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  etiqueta?: string;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  atributosExtra?: Record<string, unknown>;
}
