import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AsignarActivoDto {
  @ApiProperty({
    required: false,
    description: 'Usuario interno al que se asigna el activo',
  })
  @IsOptional()
  @IsString()
  usuarioId?: string;

  @ApiProperty({
    required: false,
    description: 'Cliente externo al que se asigna el activo',
  })
  @IsOptional()
  @IsString()
  clienteId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;
}
