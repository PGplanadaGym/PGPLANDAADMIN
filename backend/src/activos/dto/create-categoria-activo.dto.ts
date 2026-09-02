import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateCategoriaActivoDto {
  @ApiProperty()
  @IsString()
  nombre!: string;
}
