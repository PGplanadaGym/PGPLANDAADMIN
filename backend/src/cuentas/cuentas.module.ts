import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CuentasController } from './cuentas.controller';
import { CuentasService } from './cuentas.service';

@Module({
  imports: [AuthModule],
  controllers: [CuentasController],
  providers: [CuentasService],
})
export class CuentasModule {}
