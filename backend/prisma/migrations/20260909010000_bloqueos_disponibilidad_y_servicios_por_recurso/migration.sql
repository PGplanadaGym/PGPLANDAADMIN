-- Bloqueos puntuales de disponibilidad de un recurso (vacaciones, día libre, etc.)
CREATE TABLE "BloqueoDisponibilidad" (
    "id" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "horaInicio" TEXT,
    "horaFin" TEXT,
    "motivo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BloqueoDisponibilidad_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BloqueoDisponibilidad_recursoId_fecha_idx" ON "BloqueoDisponibilidad"("recursoId", "fecha");

ALTER TABLE "BloqueoDisponibilidad" ADD CONSTRAINT "BloqueoDisponibilidad_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "Recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Relación muchos-a-muchos implícita: qué tipos de cita ofrece cada recurso
CREATE TABLE "_RecursoTipoCita" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "_RecursoTipoCita_AB_unique" ON "_RecursoTipoCita"("A", "B");
CREATE INDEX "_RecursoTipoCita_B_index" ON "_RecursoTipoCita"("B");

ALTER TABLE "_RecursoTipoCita" ADD CONSTRAINT "_RecursoTipoCita_A_fkey" FOREIGN KEY ("A") REFERENCES "Recurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_RecursoTipoCita" ADD CONSTRAINT "_RecursoTipoCita_B_fkey" FOREIGN KEY ("B") REFERENCES "TipoCita"("id") ON DELETE CASCADE ON UPDATE CASCADE;
