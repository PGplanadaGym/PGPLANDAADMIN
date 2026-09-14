import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateProveedorDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contacto?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ required: false, description: 'RUC del proveedor' })
  @IsOptional()
  @IsString()
  ruc?: string;
}
