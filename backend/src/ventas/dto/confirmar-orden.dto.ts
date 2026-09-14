import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ConfirmarOrdenDto {
  @ApiProperty({
    required: false,
    description:
      'Categoría de ingreso para registrar la venta en Cuentas (si el módulo está activo)',
  })
  @IsOptional()
  @IsString()
  categoriaIngresoId?: string;

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
