import { Module } from '@nestjs/common';
import { TiposCitaController } from './tipos-cita.controller';
import { TiposCitaService } from './tipos-cita.service';

@Module({
  controllers: [TiposCitaController],
  providers: [TiposCitaService],
})
export class TiposCitaModule {}
