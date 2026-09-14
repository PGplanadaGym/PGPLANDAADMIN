import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdatePerfilDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsUrl()
  fotoUrl?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  cargo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;
}
