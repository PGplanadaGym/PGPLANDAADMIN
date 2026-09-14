import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class RegistroValoresDto {
  @ApiProperty({ type: Object })
  @IsObject()
  valores!: Record<string, unknown>;
}
