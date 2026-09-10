import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class SetTiposCitaDto {
  @ApiProperty({
    type: [String],
    description: 'IDs de los tipos de cita que ofrece este recurso. Vacío = ofrece todos.',
  })
  @IsArray()
  @IsString({ each: true })
  tipoCitaIds!: string[];
}
