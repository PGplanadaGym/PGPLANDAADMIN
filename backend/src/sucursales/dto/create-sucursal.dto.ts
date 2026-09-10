import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class CreateSucursalDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiProperty({
    required: false,
    description: 'Código de establecimiento SRI (3 dígitos, ej. "001")',
  })
  @IsOptional()
  @Matches(/^\d{3}$/, { message: 'El código de establecimiento debe ser de 3 dígitos (ej. 001)' })
  codigoEstablecimiento?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ required: false, description: 'Usuario responsable de la sucursal' })
  @IsOptional()
  @IsString()
  encargadoId?: string;

  @ApiProperty({ required: false, description: 'Ej: "Lun-Vie 9:00-18:00"' })
  @IsOptional()
  @IsString()
  horarioAtencion?: string;
}
