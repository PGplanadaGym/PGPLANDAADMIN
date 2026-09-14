ALTER TABLE "TipoCita" ADD COLUMN "descripcion" TEXT;
ALTER TABLE "TipoCita" ADD COLUMN "precio" DECIMAL(10,2);

ALTER TABLE "MovimientoCuenta" ADD COLUMN "citaId" TEXT;

ALTER TABLE "MovimientoCuenta" ADD CONSTRAINT "MovimientoCuenta_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita"("id") ON DELETE CASCADE ON UPDATE CASCADE;
