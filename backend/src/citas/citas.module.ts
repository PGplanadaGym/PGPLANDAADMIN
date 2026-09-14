import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CitasController } from './citas.controller';
import { CitasService } from './citas.service';
import { RecordatoriosService } from './recordatorios.service';

@Module({
  imports: [AuthModule],
  controllers: [CitasController],
  providers: [CitasService, RecordatoriosService],
})
export class CitasModule {}
