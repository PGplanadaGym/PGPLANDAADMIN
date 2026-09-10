ALTER TABLE "MovimientoStock" ADD COLUMN "sucursalId" TEXT;
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
