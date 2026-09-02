-- AlterTable
ALTER TABLE "CosteoProyecto" ADD COLUMN "estado" TEXT NOT NULL DEFAULT 'borrador';
ALTER TABLE "CosteoProyecto" ADD COLUMN "precioVenta" DECIMAL(10,2);
ALTER TABLE "CosteoProyecto" ADD COLUMN "costoTotalSnapshot" DECIMAL(10,2);
ALTER TABLE "CosteoProyecto" ADD COLUMN "fechaVenta" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MovimientoCuenta" ADD COLUMN "costeoProyectoId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MovimientoCuenta_costeoProyectoId_key" ON "MovimientoCuenta"("costeoProyectoId");

-- AddForeignKey
ALTER TABLE "MovimientoCuenta" ADD CONSTRAINT "MovimientoCuenta_costeoProyectoId_fkey" FOREIGN KEY ("costeoProyectoId") REFERENCES "CosteoProyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
