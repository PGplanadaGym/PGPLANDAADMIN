import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateMedicionDto } from './create-medicion.dto';

export class UpdateMedicionDto extends PartialType(
  OmitType(CreateMedicionDto, ['clienteId'] as const),
) {}
