# ---------- Etapa de construcción ----------
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app

# Manifiestos primero (mejor cacheo de capas)
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile=false

# Código fuente
COPY packages/shared-types packages/shared-types
COPY apps/web apps/web

# Construir tipos compartidos y la app Angular (salida en apps/web/dist/web/browser)
RUN pnpm --filter @restaurante/shared-types build \
 && pnpm --filter @restaurante/web build

# ---------- Etapa de ejecución (nginx) ----------
FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist/web/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
