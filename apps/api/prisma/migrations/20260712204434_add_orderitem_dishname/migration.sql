-- 1. Crear la columna dishName como nullable para poder hacer el backfill.
ALTER TABLE "order_items" ADD COLUMN "dishName" TEXT;

-- 2. Backfill: tomar el nombre del plato desde la tabla de platos.
--    Si el plato ya fue eliminado (FK Restrict, no debería pasar), queda NULL.
UPDATE "order_items" oi
SET "dishName" = d."name"
FROM "dishes" d
WHERE oi."dishId" = d.id;

-- 3. Para cualquier OrderItem sin plato (huérfanos, no debería haber),
--    usar un placeholder para satisfacer la constraint NOT NULL.
UPDATE "order_items" SET "dishName" = 'Plato eliminado' WHERE "dishName" IS NULL;

-- 4. Ahora sí, NOT NULL.
ALTER TABLE "order_items" ALTER COLUMN "dishName" SET NOT NULL;
