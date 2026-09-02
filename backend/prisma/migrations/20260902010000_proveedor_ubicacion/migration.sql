-- Ubicación geográfica opcional del proveedor (para mostrarlo en un mapa)
ALTER TABLE "Proveedor" ADD COLUMN "latitud" DOUBLE PRECISION;
ALTER TABLE "Proveedor" ADD COLUMN "longitud" DOUBLE PRECISION;
