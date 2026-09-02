import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ActualizarModuloDto {
  @ApiProperty()
  @IsBoolean()
  activo!: boolean;
}
