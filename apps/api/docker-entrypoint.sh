#!/bin/sh
set -e

echo "Aplicando migraciones de base de datos..."
npx prisma migrate deploy

echo "Ejecutando seed inicial (idempotente)..."
TS_NODE_TRANSPILE_ONLY=1 npx prisma db seed || echo "Seed omitido."

echo "Iniciando la API..."
exec node dist/main.js
