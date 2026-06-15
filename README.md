# Sistema de Gestión de Restaurantes 🍽️

Plataforma de **gestión de operaciones** para restaurantes pequeños y medianos en
Perú — cevicherías, pollerías, cafés y menús. Administra mesas, pedidos, flujo de
cocina, división de cuentas, pagos y caja diaria. **No es un POS de facturación
electrónica**: se enfoca en la operación del salón.

> Interfaz 100 % en español · Marca configurable · Listo para demostrar y vender.

---

## ✨ Funcionalidades

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
- **Caja diaria**: apertura, ingresos/egresos, cierre con monto esperado vs. real
  y diferencia.
- **Reportes**: ingresos diarios/semanales/mensuales, platos más vendidos, mesas
  más usadas e ingresos por método de pago.
- **Auditoría** de acciones sensibles (usuario, acción, fecha/hora).
- **Configuración de marca**: nombre, logo, colores; el tema se adapta a toda la app.
- **Roles**: Administrador (acceso total) y Mesero / Operador (operación diaria).

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

| Rol | Correo | Contraseña |
|-----|--------|-----------|
| Administrador | `admin@restaurante.pe` | `Admin1234` |
| Mesero / Operador | `mesero@restaurante.pe` | `Mesero1234` |

> Cambie estos valores y los secretos JWT en `.env` antes de usar en producción.

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
      modules/              # auth, users, restaurant-settings, tables, menu,
                            # orders (+ billing), kitchen, payments,
                            # cash-register, reports, audit
    prisma/                 # schema, migraciones y seed
  web/                      # Angular — frontend
    src/app/
      core/                 # servicios, guards, interceptores, clientes API
      shared/               # componentes/pipes reutilizables (Icon, pipes)
      layouts/              # shell principal
      features/             # dashboard, tables, kitchen, orders, menu,
                            # cash, reports, settings, users, auth
packages/
  shared-types/             # enums, DTOs y etiquetas en español (web ↔ api)
docker/                     # (reservado)
docs/                       # ARCHITECTURE.md, COMPLIANCE.md
docker-compose.yml
```

---

## 🔌 Resumen de la API

Todas las rutas viven bajo el prefijo `/api`. Documentación interactiva en
`/api/docs`. Autenticación con `Authorization: Bearer <token>`.

| Módulo | Rutas principales |
|--------|-------------------|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` |
| Mesas | `GET/POST /tables`, `PATCH /tables/:id/status` |
| Carta | `GET/POST /menu/categories`, `GET/POST /menu/dishes` |
| Pedidos | `POST /orders`, `POST /orders/:id/items`, `POST /orders/items/:id/replace` |
| División | `POST /orders/:id/split/even`, `POST /orders/:id/split/items` |
| Pagos | `POST /orders/:id/payments` |
| Cocina | `GET /kitchen/queue`, `PATCH /kitchen/items/:id/status` |
| Caja | `POST /cash-register/open`, `/movements`, `/close` |
| Reportes | `GET /reports/dashboard`, `/revenue`, `/top-dishes`, `/payments-by-method` |

---

## 📜 Licencia

Software propietario para demostración comercial. © 2026.
