import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EmpresasService } from './empresas.service';

@ApiTags('public')
@Controller('public')
export class PublicBrandingController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Get('branding')
  branding() {
    return this.empresasService.findBrandingPublico();
  }
}
