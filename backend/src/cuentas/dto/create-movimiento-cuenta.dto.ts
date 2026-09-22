import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { TIPOS_MOVIMIENTO_CUENTA } from './create-categoria-movimiento.dto';

export class CreateMovimientoCuentaDto {
  @ApiProperty({ enum: TIPOS_MOVIMIENTO_CUENTA })
  @IsIn(TIPOS_MOVIMIENTO_CUENTA)
  tipo!: (typeof TIPOS_MOVIMIENTO_CUENTA)[number];

  @ApiProperty()
  @IsString()
  categoriaId!: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  monto!: number;

  @ApiProperty()
  @IsISO8601()
  fecha!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;

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
  @ValidateIf((o) => !!o.comprobanteUrl)
  @IsUrl()
  comprobanteUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clienteId?: string;
}
