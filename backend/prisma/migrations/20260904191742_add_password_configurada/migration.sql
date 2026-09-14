-- DropForeignKey
ALTER TABLE "Notificacion" DROP CONSTRAINT "Notificacion_usuarioId_fkey";

-- DropIndex
DROP INDEX "Notificacion_empresaId_usuarioId_leida_idx";

-- DropIndex
DROP INDEX "PagoNomina_empresaId_periodo_idx";

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "sessionId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "passwordConfigurada" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
