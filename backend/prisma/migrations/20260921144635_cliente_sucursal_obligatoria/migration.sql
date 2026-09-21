-- Todos los clientes ya deben tener sucursalId asignado antes de esta migración
-- (backfill: se creó "PG Planada Gym Norte" y se asignaron los clientes existentes).
ALTER TABLE "Cliente" ALTER COLUMN "sucursalId" SET NOT NULL;
