# Sistema de Gestión de Restaurantes 🍽️

Plataforma de **gestión de operaciones** para restaurantes pequeños y medianos en
Perú — cevicherías, pollerías, cafés y menús. Administra mesas, pedidos, flujo de
cocina, división de cuentas, pagos y caja diaria. **No es un POS de facturación
electrónica**: se enfoca en la operación del salón.

> Interfaz 100 % en español · Multi-local · Marca configurable por local · Listo
> para demostrar y vender.

---

## ✨ Funcionalidades

- **Multi-local** (sucursales): opera N locales bajo un mismo tenant, cada uno
  con carta, mesas, pedidos, caja y membresías propios. La marca visual
  hereda del tenant y puede sobreescribirse por local.
- **Panel** con mesas libres/ocupadas, pedidos activos, platos en preparación e
  ingresos del día y del mes.
- **Salón visual** (vista tipo plano) con estados: Libre, Ocupada, Reservada,
  Fuera de servicio.
- **Pedidos por mesa**: una mesa = un pedido activo, con ítems, notas
  ("Sin cebolla"), cantidades y precios.
- **Flujo de cocina**: tablero Pendiente → Preparando → Entregado.
- **Protección de platos entregados**: un plato entregado nunca se elimina; se
  corrige creando un reemplazo y se conserva la traza completa.
- **División de cuenta** (split): por ítems seleccionados, en partes iguales o
  escenarios mixtos.
- **Pagos** en Efectivo, Yape, Plin y Tarjeta, con pagos **parciales y combinados**;
  el pedido se cierra automáticamente al saldar.
- **Caja diaria por local**: apertura, ingresos/egresos, cierre con monto
  esperado vs. real y diferencia.
- **Reportes por local**: ingresos diarios/semanales/mensuales, platos más
  vendidos, mesas más usadas e ingresos por método de pago.
- **Auditoría** de acciones sensibles (usuario, acción, fecha/hora, local).
- **Configuración de marca por local**: nombre, logo, colores; el tema se
  adapta a toda la app.
- **Roles**: Administrador (acceso total) y Mesero / Operador (operación
  diaria). Un usuario puede ser ADMIN en un local y OPERATOR en otro.

---

## 🧱 Stack tecnológico

| Capa        | Tecnología |
|-------------|------------|
| Frontend    | Angular 18 (standalone components + signals) |
| Backend     | NestJS 10 + TypeScript (Clean Architecture) |
| Base de datos | PostgreSQL 16 |
| ORM         | Prisma 5 |
| Auth        | JWT (access + refresh) + RBAC |
| Docs API    | Swagger / OpenAPI |
| Monorepo    | pnpm workspaces |
| Infra       | Docker Compose (Postgres + API + Web/nginx) |

Detalle de decisiones en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) y de
cumplimiento de la Ley N° 29733 en [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md).

---

## 🚀 Inicio rápido (Docker)

Requisitos: **Docker** y **Docker Compose**.

```bash
# 1. Configurar entorno
cp .env.example .env          # ajuste secretos/puertos si lo desea

# 2. Levantar todo (Postgres + API + Web)
docker compose up -d
```

El contenedor de la API aplica las migraciones y siembra datos de ejemplo
automáticamente. Luego abra:

- **Aplicación web:** http://localhost:4200
- **API (Swagger):** http://localhost:3000/api/docs

### Credenciales iniciales

El seed inicial crea lo mínimo para arrancar:

- **1 usuario administrador** (superadmin — sin membresía, ve y opera todos los locales).
- **1 local** llamado `principal` (puedes agregar más desde `/locales`).
- **1 mesa** registrada.
- **4 categorías base** del sistema (Entradas, Platos principales, Bebidas, Postres) **sin platos**.

| Rol | Correo | Contraseña |
|-----|--------|-----------|
| Administrador | `admin@restaurante.pe` | `Admin1234` |

> Cambie estos valores y los secretos JWT en `.env` antes de usar en producción.

### Despliegue en producción con Traefik

```bash
# 1. Una red Docker externa llamada 'traefik-public' (gestionada por Traefik)
docker network create traefik-public

# 2. Configurar .env (ver .env.example):
#    - POSTGRES_PASSWORD
#    - JWT_ACCESS_SECRET, JWT_REFRESH_SECRET (openssl rand -base64 48)
#    - CORS_ORIGIN=https://tu-dominio.com
#    - DOMAIN=tu-dominio.com
#    - COOKIE_SECURE=true

# 3. Levantar
docker compose -f docker-compose.prod.yml up -d --build
```

Solo el contenedor `web` se expone a Internet (HTTPS automático con Let's Encrypt
vía Traefik). La API queda en una red interna. Más detalles en
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## 🛠️ Desarrollo local (sin Docker)

```bash
pnpm install

# Levantar solo la base de datos
docker compose up -d postgres

# Generar cliente Prisma, migrar y sembrar
pnpm --filter @restaurante/api prisma:generate
pnpm --filter @restaurante/api prisma:migrate
pnpm --filter @restaurante/api prisma:seed

# En dos terminales:
pnpm dev:api    # API en http://localhost:3000
pnpm dev:web    # Web en http://localhost:4200 (proxy /api → :3000)
```

> En desarrollo, `apps/web/proxy.conf.json` reenvía `/api` a `http://localhost:3000`,
> evitando problemas de CORS.

---

## 📂 Estructura del proyecto

```
apps/
  api/                      # NestJS — backend (Clean Architecture)
    src/
      common/               # decoradores, guards, utilidades
      core/prisma/          # acceso a base de datos
      config/               # configuración tipada
      modules/              # auth, users, restaurants, restaurant-settings,
                            # tables, menu, orders (+ billing), kitchen,
                            # payments, cash-register, reports, audit
    prisma/                 # schema, migraciones y seed multi-local
  web/                      # Angular — frontend
    src/app/
      core/                 # servicios, guards, interceptores, clientes API
      shared/               # componentes/pipes reutilizables (Icon, pipes,
                            # selector de local)
      layouts/              # shell principal (con selector de local)
      features/             # dashboard, tables, kitchen, orders, menu,
                            # cash, reports, settings, users, auth,
                            # restaurants (CRUD + gestión de miembros)
packages/
  shared-types/             # enums, DTOs y etiquetas en español (web ↔ api)
docker/                     # (reservado)
docs/                       # ARCHITECTURE.md, COMPLIANCE.md
docker-compose.yml
```

---

## 🔌 Resumen de la API

Todas las rutas viven bajo el prefijo `/api`. Documentación interactiva en
`/api/docs`. Autenticación con `Authorization: Bearer <token>`. Las rutas
operativas requieren el header `X-Restaurant-Id` (inyectado
automáticamente por el frontend).

| Módulo | Rutas principales |
|--------|-------------------|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` |
| Mis locales | `GET /my-restaurants` |
| Locales (ADMIN) | `GET/POST /restaurants`, `PATCH /restaurants/:id` |
| Marca del local | `GET /restaurants/:id/theme` |
| Membresías (ADMIN) | `GET/POST /restaurants/:id/members`, `PATCH /restaurants/:id/members/:memberId`, `DELETE /restaurants/:id/members/:memberId` |
| Mesas | `GET/POST /tables`, `PATCH /tables/:id/status` |
| Carta | `GET/POST /menu/categories`, `GET/POST /menu/dishes` |
| Pedidos | `POST /orders`, `POST /orders/:id/items`, `POST /orders/items/:id/replace` |
| División | `POST /orders/:id/split/even`, `POST /orders/:id/split/items` |
| Pagos | `POST /orders/:id/payments` |
| Cocina | `GET /kitchen/queue`, `PATCH /kitchen/items/:id/status` |
| Caja | `POST /cash-register/open`, `/movements`, `/close` |
| Reportes | `GET /reports/dashboard`, `/revenue`, `/top-dishes`, `/payments-by-method` |

---

## 📚 Documentación

La documentación completa para desarrolladores y agentes está en
[`docs/`](docs/README.md):

- [**DEVELOPMENT.md**](docs/DEVELOPMENT.md) — empieza aquí: puesta en marcha,
  convenciones, cómo agregar módulos/pantallas, despliegue, troubleshooting.
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — decisiones de arquitectura.
- [DATA-MODEL.md](docs/DATA-MODEL.md) — entidades, relaciones y reglas de negocio.
- [API.md](docs/API.md) — referencia de endpoints.
- [COMPLIANCE.md](docs/COMPLIANCE.md) — cumplimiento de la Ley N° 29733.

---

## 🆘 Soporte

¿Necesitas ayuda? La app incluye una sección **Soporte** en el menú lateral, o
contáctanos directamente:

- **WhatsApp:** +51 910 840 344
- **Correo:** seracava2503@gmail.com

---

## 📜 Licencia

Software propietario para demostración comercial. © 2026.
