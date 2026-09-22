import { ApiProperty } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';

export class UpdateMovimientoCuentaDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoriaId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  monto?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  fecha?: string;

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
