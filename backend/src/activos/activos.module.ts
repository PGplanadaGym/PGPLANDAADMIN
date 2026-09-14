import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ActivosController } from './activos.controller';
import { CategoriasActivoController } from './categorias-activo.controller';
import { ActivosService } from './activos.service';

@Module({
  imports: [AuthModule],
  controllers: [ActivosController, CategoriasActivoController],
  providers: [ActivosService],
})
export class ActivosModule {}
