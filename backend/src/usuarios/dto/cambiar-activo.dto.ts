import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class CambiarActivoDto {
  @ApiProperty()
  @IsBoolean()
  activo!: boolean;
}
