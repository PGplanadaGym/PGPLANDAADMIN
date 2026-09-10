import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

export class CreateEmpresaDto {
  @ApiProperty({ description: 'Nombre comercial / marca (sidebar, login, recibos)' })
  @IsString()
  nombre!: string;

  @ApiProperty({
    required: false,
    description: 'Razón social registrada en el SRI, si difiere del nombre comercial',
  })
  @IsOptional()
  @IsString()
  razonSocial?: string;

  @ApiProperty({ required: false, description: 'RUC de la empresa (13 dígitos)' })
  @IsOptional()
  @Matches(/^\d{13}$/, { message: 'El RUC debe tener 13 dígitos' })
  ruc?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  colorPrimario?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  zonaHoraria?: string;
}
