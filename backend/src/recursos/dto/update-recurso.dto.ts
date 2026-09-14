import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { TIPOS_RECURSO } from './create-recurso.dto';

export class UpdateRecursoDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ required: false, enum: TIPOS_RECURSO })
  @IsOptional()
  @IsIn(TIPOS_RECURSO)
  tipo?: (typeof TIPOS_RECURSO)[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  usuarioId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sucursalId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
