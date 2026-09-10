ALTER TABLE "MovimientoCuenta" ADD COLUMN "mantenimientoId" TEXT;

ALTER TABLE "MovimientoCuenta" ADD CONSTRAINT "MovimientoCuenta_mantenimientoId_fkey" FOREIGN KEY ("mantenimientoId") REFERENCES "MantenimientoActivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
