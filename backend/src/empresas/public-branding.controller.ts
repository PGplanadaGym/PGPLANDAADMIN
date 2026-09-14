import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { EmpresasService } from './empresas.service';

@ApiTags('public')
@UseGuards(ThrottlerGuard)
@Controller('public')
export class PublicBrandingController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Get('branding')
  branding() {
    return this.empresasService.findBrandingPublico();
  }
}
