import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RecibirOrdenCompraDto {
  @ApiProperty({
    required: false,
    description:
      'Categoría de egreso para registrar la compra en Cuentas (si el módulo está activo)',
  })
  @IsOptional()
  @IsString()
  categoriaEgresoId?: string;
}
