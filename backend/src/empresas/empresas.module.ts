import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ModulosModule } from '../modulos/modulos.module';
import { EmpresasController } from './empresas.controller';
import { PublicBrandingController } from './public-branding.controller';
import { EmpresasService } from './empresas.service';

@Module({
  imports: [
    ModulosModule,
    // límite de intentos solo para el branding público de login (endpoint sin auth)
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
  ],
  controllers: [EmpresasController, PublicBrandingController],
  providers: [EmpresasService],
  exports: [EmpresasService],
})
export class EmpresasModule {}
