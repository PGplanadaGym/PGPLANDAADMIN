import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { CreateCampoDinamicoDto } from './create-campo-dinamico.dto';

export class CreateEntidadDinamicaDto {
  @ApiProperty()
  @IsString()
  clave!: string;

  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty({ type: [CreateCampoDinamicoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCampoDinamicoDto)
  campos!: CreateCampoDinamicoDto[];
}
