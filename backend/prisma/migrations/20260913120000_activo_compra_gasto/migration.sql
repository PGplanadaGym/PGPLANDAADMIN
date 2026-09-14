ALTER TABLE "MovimientoCuenta" ADD COLUMN "activoId" TEXT;

ALTER TABLE "MovimientoCuenta" ADD CONSTRAINT "MovimientoCuenta_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
