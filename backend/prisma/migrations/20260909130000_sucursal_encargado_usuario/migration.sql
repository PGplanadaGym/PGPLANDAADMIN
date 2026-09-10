ALTER TABLE "Sucursal" DROP COLUMN "encargado";
ALTER TABLE "Sucursal" ADD COLUMN "encargadoId" TEXT;
ALTER TABLE "Sucursal" ADD CONSTRAINT "Sucursal_encargadoId_fkey" FOREIGN KEY ("encargadoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
