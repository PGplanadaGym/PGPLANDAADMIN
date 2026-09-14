import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateCategoriaProductoDto {
  @ApiProperty()
  @IsString()
  nombre!: string;
}
