import { Module } from '@nestjs/common';
import { EntidadesDinamicasController } from './entidades-dinamicas.controller';
import { EntidadesDinamicasService } from './entidades-dinamicas.service';
import { RegistrosDinamicosController } from './registros-dinamicos.controller';
import { RegistrosDinamicosService } from './registros-dinamicos.service';
import { MetaController } from './meta.controller';

@Module({
  controllers: [
    EntidadesDinamicasController,
    RegistrosDinamicosController,
    MetaController,
  ],
  providers: [EntidadesDinamicasService, RegistrosDinamicosService],
})
export class MetadataModule {}
