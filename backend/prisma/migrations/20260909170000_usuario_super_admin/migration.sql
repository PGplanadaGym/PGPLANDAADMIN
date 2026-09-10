-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "esSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Marca al dueño de la plataforma como super-admin
UPDATE "Usuario" SET "esSuperAdmin" = true WHERE "email" = 'dannyajila2000@gmail.com';
