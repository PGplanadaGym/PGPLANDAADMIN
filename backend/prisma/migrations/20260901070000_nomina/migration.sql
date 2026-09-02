-- Nómina: registro simple de pagos a empleados
CREATE TABLE "PagoNomina" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "sueldoBase" DECIMAL(10,2) NOT NULL,
    "bonos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "descuentos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPagado" DECIMAL(10,2) NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "notas" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoNomina_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PagoNomina" ADD CONSTRAINT "PagoNomina_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PagoNomina" ADD CONSTRAINT "PagoNomina_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PagoNomina" ADD CONSTRAINT "PagoNomina_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "PagoNomina_empresaId_periodo_idx" ON "PagoNomina"("empresaId", "periodo");

-- MovimientoCuenta: vínculo opcional al pago de nómina que lo generó
ALTER TABLE "MovimientoCuenta" ADD COLUMN "pagoNominaId" TEXT;

ALTER TABLE "MovimientoCuenta" ADD CONSTRAINT "MovimientoCuenta_pagoNominaId_fkey" FOREIGN KEY ("pagoNominaId") REFERENCES "PagoNomina"("id") ON DELETE CASCADE ON UPDATE CASCADE;
