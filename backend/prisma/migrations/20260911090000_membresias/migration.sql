-- Catálogo de planes de membresía por empresa (ej. Mensual, Trimestral, Anual)
CREATE TABLE "PlanMembresia" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "duracionDias" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PlanMembresia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanMembresia_empresaId_nombre_key" ON "PlanMembresia"("empresaId", "nombre");

ALTER TABLE "PlanMembresia" ADD CONSTRAINT "PlanMembresia_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cada fila es una renovación/período de membresía de un socio (historial, no se sobreescribe)
CREATE TABLE "Membresia" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "avisoEnviado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membresia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Membresia_clienteId_fechaVencimiento_idx" ON "Membresia"("clienteId", "fechaVencimiento");

ALTER TABLE "Membresia" ADD CONSTRAINT "Membresia_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Membresia" ADD CONSTRAINT "Membresia_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Membresia" ADD CONSTRAINT "Membresia_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanMembresia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Permite vincular la renovación de una membresía a un ingreso, igual que citaId/ordenId/pagoNominaId
ALTER TABLE "MovimientoCuenta" ADD COLUMN "membresiaId" TEXT;

ALTER TABLE "MovimientoCuenta" ADD CONSTRAINT "MovimientoCuenta_membresiaId_fkey" FOREIGN KEY ("membresiaId") REFERENCES "Membresia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
