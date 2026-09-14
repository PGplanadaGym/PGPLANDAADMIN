import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RenovarMembresiaDto {
  @ApiProperty()
  @IsString()
  planId!: string;
}
