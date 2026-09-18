import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlanesMembresiaController } from './planes-membresia.controller';
import { PlanesMembresiaService } from './planes-membresia.service';
import { MembresiasController } from './membresias.controller';
import { MembresiasService } from './membresias.service';
import { AvisosMembresiaService } from './avisos-membresia.service';

@Module({
  imports: [AuthModule],
  controllers: [PlanesMembresiaController, MembresiasController],
  providers: [PlanesMembresiaService, MembresiasService, AvisosMembresiaService],
  exports: [MembresiasService],
})
export class MembresiasModule {}
