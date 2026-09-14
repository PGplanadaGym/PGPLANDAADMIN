-- AlterTable: el sistema opera en Ecuador, no en Perú
ALTER TABLE "Empresa" ALTER COLUMN "zonaHoraria" SET DEFAULT 'America/Guayaquil';

-- Corrige las empresas ya creadas que quedaron con el valor por defecto anterior
UPDATE "Empresa" SET "zonaHoraria" = 'America/Guayaquil' WHERE "zonaHoraria" = 'America/Lima';
