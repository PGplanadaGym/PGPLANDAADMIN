import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Edición de un empleado hecha por un administrador (no por el propio usuario). */
export class UpdateUsuarioAdminDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  cargo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;
}
