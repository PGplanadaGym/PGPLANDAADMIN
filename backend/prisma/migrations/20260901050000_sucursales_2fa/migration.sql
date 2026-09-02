-- Sucursales: vínculo desde Usuario, Recurso, Activo, MovimientoCuenta
ALTER TABLE "Usuario" ADD COLUMN "sucursalId" TEXT;
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Recurso" ADD COLUMN "sucursalId" TEXT;
ALTER TABLE "Recurso" ADD CONSTRAINT "Recurso_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Activo" ADD COLUMN "sucursalId" TEXT;
ALTER TABLE "Activo" ADD CONSTRAINT "Activo_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MovimientoCuenta" ADD COLUMN "sucursalId" TEXT;
ALTER TABLE "MovimientoCuenta" ADD CONSTRAINT "MovimientoCuenta_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Verificación en dos pasos (2FA por TOTP)
ALTER TABLE "Usuario" ADD COLUMN "twoFactorSecret" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN "twoFactorBackupCodes" TEXT[] NOT NULL DEFAULT '{}';
