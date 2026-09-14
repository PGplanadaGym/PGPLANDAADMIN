import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DevolverActivoDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;
}
