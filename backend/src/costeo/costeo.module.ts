import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CosteoController } from './costeo.controller';
import { CosteoService } from './costeo.service';

@Module({
  imports: [AuthModule],
  controllers: [CosteoController],
  providers: [CosteoService],
})
export class CosteoModule {}
