import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NominaController } from './nomina.controller';
import { NominaService } from './nomina.service';

@Module({
  imports: [AuthModule],
  controllers: [NominaController],
  providers: [NominaService],
})
export class NominaModule {}
