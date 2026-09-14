import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AsistenciaController } from './asistencia.controller';
import { AsistenciaService } from './asistencia.service';

@Module({
  imports: [AuthModule],
  controllers: [AsistenciaController],
  providers: [AsistenciaService],
})
export class AsistenciaModule {}
