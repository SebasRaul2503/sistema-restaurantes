-- AlterTable: email pasa a ser opcional, se añade username opcional único.

-- 1. Crear la columna username (nullable, sin default).
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- 2. Backfill defensivo (no debería haber usernames vacíos porque la columna es nueva).
UPDATE "users" SET "username" = NULL WHERE "username" = '';

-- 3. Restricción única.
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "users_username_idx" ON "users"("username");

-- 4. Hacer email opcional (todos los usuarios existentes tienen email, así que la
--    constraint "email OR username" se sigue cumpliendo).
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
