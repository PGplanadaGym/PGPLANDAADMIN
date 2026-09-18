import { Module } from '@nestjs/common';
import { MembresiasModule } from '../membresias/membresias.module';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';

@Module({
  imports: [MembresiasModule],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
