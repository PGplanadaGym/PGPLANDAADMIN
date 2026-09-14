import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class HorarioDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana!: number;

  @ApiProperty()
  @IsString()
  horaInicio!: string;

  @ApiProperty()
  @IsString()
  horaFin!: string;
}

export class SetHorariosDto {
  @ApiProperty({ type: [HorarioDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorarioDto)
  horarios!: HorarioDto[];
}
