import { PartialType } from '@nestjs/swagger';
import { CreatePlanMembresiaDto } from './create-plan-membresia.dto';

export class UpdatePlanMembresiaDto extends PartialType(CreatePlanMembresiaDto) {}
