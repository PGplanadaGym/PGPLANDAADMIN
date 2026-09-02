import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateUsuarioDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  rolIds?: string[];
}
