import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class EditarVencimientoMembresiaDto {
  @ApiProperty()
  @IsISO8601()
  fechaVencimiento!: string;
}
