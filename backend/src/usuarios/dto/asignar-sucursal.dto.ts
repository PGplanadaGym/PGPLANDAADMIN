import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AsignarSucursalDto {
  @ApiProperty({
    required: false,
    description: 'null para quitar la sucursal asignada',
  })
  @IsOptional()
  @IsString()
  sucursalId?: string | null;
}
