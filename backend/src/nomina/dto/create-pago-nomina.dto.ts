import { ApiProperty } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreatePagoNominaDto {
  @ApiProperty()
  @IsString()
  empleadoId!: string;

  @ApiProperty({
    description: 'Año-mes al que corresponde el pago, ej: "2026-09"',
  })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'periodo debe tener el formato AAAA-MM',
  })
  periodo!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  sueldoBase!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bonos?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  descuentos?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  fechaPago?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({
    required: false,
    description:
      'Categoría de egreso para registrar el pago en Cuentas (si el módulo está activo)',
  })
  @IsOptional()
  @IsString()
  categoriaEgresoId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  metodoPago?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  numeroComprobante?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comprobanteUrl?: string;
}
