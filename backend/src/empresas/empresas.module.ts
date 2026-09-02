import { Module } from '@nestjs/common';
import { EmpresasController } from './empresas.controller';
import { PublicBrandingController } from './public-branding.controller';
import { EmpresasService } from './empresas.service';

@Module({
  controllers: [EmpresasController, PublicBrandingController],
  providers: [EmpresasService],
  exports: [EmpresasService],
})
export class EmpresasModule {}
