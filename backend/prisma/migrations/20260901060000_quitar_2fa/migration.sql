-- Se retira la verificación en dos pasos (2FA) a pedido del cliente.
ALTER TABLE "Usuario" DROP COLUMN "twoFactorSecret";
ALTER TABLE "Usuario" DROP COLUMN "twoFactorEnabled";
ALTER TABLE "Usuario" DROP COLUMN "twoFactorBackupCodes";
