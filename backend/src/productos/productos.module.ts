import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProductosController } from './productos.controller';
import { CategoriasProductoController } from './categorias-producto.controller';
import { ProductosService } from './productos.service';

@Module({
  imports: [AuthModule],
  controllers: [ProductosController, CategoriasProductoController],
  providers: [ProductosService],
})
export class ProductosModule {}
