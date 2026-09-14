import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetHabilitadoModuloDto {
  @ApiProperty()
  @IsBoolean()
  habilitado!: boolean;
}
