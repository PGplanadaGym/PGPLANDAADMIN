-- CreateTable
CREATE TABLE "Recurso" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "usuarioId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorarioAtencion" (
    "id" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,

    CONSTRAINT "HorarioAtencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoCita" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "duracionMinutos" INTEGER NOT NULL,
    "bufferMinutos" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#0F172A',
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoCita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cita" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "clienteId" TEXT,
    "recursoId" TEXT NOT NULL,
    "tipoCitaId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "notas" TEXT,
    "recordatorioEnviado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Recurso" ADD CONSTRAINT "Recurso_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioAtencion" ADD CONSTRAINT "HorarioAtencion_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "Recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoCita" ADD CONSTRAINT "TipoCita_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "Recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_tipoCitaId_fkey" FOREIGN KEY ("tipoCitaId") REFERENCES "TipoCita"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
