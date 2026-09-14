-- AlterTable
ALTER TABLE "RefreshToken"
ADD COLUMN "sessionId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
ADD COLUMN "inicioSesionEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "userAgent" TEXT,
ADD COLUMN "ip" TEXT;

-- CreateTable
CREATE TABLE "RegistroAuditoria" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "detalle" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAuditoria_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RegistroAuditoria" ADD CONSTRAINT "RegistroAuditoria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAuditoria" ADD CONSTRAINT "RegistroAuditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
