import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DevolverTodosActivosDto {
  @ApiProperty({ description: 'Usuario del que se devuelven todos sus activos asignados' })
  @IsString()
  usuarioId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;
}
