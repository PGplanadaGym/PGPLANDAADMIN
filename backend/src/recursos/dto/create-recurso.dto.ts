import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export const TIPOS_RECURSO = ['persona', 'sala', 'equipo'] as const;

export class CreateRecursoDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty({ enum: TIPOS_RECURSO })
  @IsIn(TIPOS_RECURSO)
  tipo!: (typeof TIPOS_RECURSO)[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  usuarioId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sucursalId?: string;
}
