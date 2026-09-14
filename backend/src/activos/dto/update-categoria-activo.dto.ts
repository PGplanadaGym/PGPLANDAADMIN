import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateCategoriaActivoDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
