import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';

export class AsignarVariosActivosDto {
  @ApiProperty({ type: [String], description: 'IDs de los activos a asignar' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  activoIds!: string[];

  @ApiProperty({
    required: false,
    description: 'Usuario interno al que se asignan los activos',
  })
  @IsOptional()
  @IsString()
  usuarioId?: string;

  @ApiProperty({
    required: false,
    description: 'Cliente externo al que se asignan los activos',
  })
  @IsOptional()
  @IsString()
  clienteId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;
}
