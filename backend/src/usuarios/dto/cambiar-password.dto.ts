import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CambiarPasswordDto {
  @ApiProperty()
  @IsString()
  passwordActual!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  passwordNueva!: string;
}
