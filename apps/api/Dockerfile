# ---------- Etapa de construcción ----------
FROM node:20-alpine AS build
RUN corepack enable && apk add --no-cache openssl
WORKDIR /app

# Manifiestos primero (mejor cacheo de capas)
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile=false

# Código fuente
COPY packages/shared-types packages/shared-types
COPY apps/api apps/api

# Construir tipos compartidos, generar Prisma Client y compilar la API
RUN pnpm --filter @restaurante/shared-types build \
 && pnpm --filter @restaurante/api prisma:generate \
 && pnpm --filter @restaurante/api build

# ---------- Etapa de ejecución ----------
FROM node:20-alpine AS runtime
RUN corepack enable && apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/packages/shared-types ./packages/shared-types
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
RUN chmod +x ./apps/api/docker-entrypoint.sh

EXPOSE 3000
WORKDIR /app/apps/api
ENTRYPOINT ["./docker-entrypoint.sh"]
