import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class UpdateSucursalDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  @ApiProperty({ required: false, description: 'Ubicación de la sucursal en el mapa' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud?: number;

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
