import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUsuarioDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'El administrador define la contraseña con la que el empleado va a ingresar' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  rolIds?: string[];
}
