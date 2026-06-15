# Guía de desarrollo

Documentación completa para desarrolladores (y agentes) que mantengan o extiendan
el **Sistema de Gestión de Restaurantes**. Asume conocimiento de TypeScript,
NestJS y Angular. Para el panorama de arquitectura, ver
[`ARCHITECTURE.md`](ARCHITECTURE.md); para el modelo de datos,
[`DATA-MODEL.md`](DATA-MODEL.md); para la API, [`API.md`](API.md).

---

## 1. Requisitos

| Herramienta | Versión |
|-------------|---------|
| Node.js     | ≥ 20    |
| pnpm        | ≥ 10    |
| Docker + Docker Compose | reciente |
| PostgreSQL  | 16 (vía Docker) |

El proyecto es un **monorepo pnpm**. Instala todo desde la raíz:

```bash
pnpm install
```

---

## 2. Puesta en marcha

### Opción A — Todo con Docker (recomendado para probar)

```bash
cp .env.example .env
docker compose up -d
```

Levanta Postgres, API y Web. La API aplica migraciones y siembra datos al
arrancar (ver `apps/api/docker-entrypoint.sh`). URLs:

- Web: http://localhost:4200
- API + Swagger: http://localhost:3000/api/docs

> Si los puertos 3000/4200/5432 están ocupados, cámbialos en `.env`
> (`API_PORT`, `WEB_PORT`, `POSTGRES_PORT`). `.env` está en `.gitignore`.

### Opción B — Desarrollo local con recarga en caliente

```bash
docker compose up -d postgres                         # solo la base de datos
pnpm --filter @restaurante/api prisma:generate         # cliente Prisma
pnpm --filter @restaurante/api prisma:migrate          # migraciones (dev)
pnpm --filter @restaurante/api prisma:seed             # datos de ejemplo

pnpm dev:api     # NestJS http://localhost:3000  (watch)
pnpm dev:web     # Angular http://localhost:4200 (watch, proxy /api → :3000)
```

`apps/web/proxy.conf.json` reenvía `/api` al backend para evitar CORS en dev.

> **Importante:** la web y la API consumen `@restaurante/shared-types`
> **compilado** (`packages/shared-types/dist`). Si editas ese paquete, recompílalo:
> `pnpm --filter @restaurante/shared-types build`.

### Credenciales de ejemplo (seed)

| Rol | Correo | Contraseña |
|-----|--------|-----------|
| Administrador | `admin@restaurante.pe` | `Admin1234` |
| Mesero / Operador | `mesero@restaurante.pe` | `Mesero1234` |

---

## 3. Comandos útiles

```bash
pnpm build                 # build de todos los paquetes (topológico)
pnpm --filter @restaurante/api build
pnpm --filter @restaurante/web build
pnpm --filter @restaurante/shared-types build

# Prisma (desde la raíz)
pnpm --filter @restaurante/api prisma:generate   # regenerar cliente
pnpm --filter @restaurante/api prisma:migrate    # crear/aplicar migración (dev)
pnpm --filter @restaurante/api prisma:deploy     # aplicar migraciones (prod)
pnpm --filter @restaurante/api prisma:seed       # sembrar datos

docker compose up -d        # stack completo
docker compose logs -f api  # logs de la API
docker compose down         # detener
```

---

## 4. Estructura del monorepo

```
apps/
  api/    → backend NestJS (ver §5)
  web/    → frontend Angular (ver §6)
packages/
  shared-types/   → contratos compartidos web ↔ api (enums, DTOs, etiquetas)
docker/           → (reservado para scripts de infraestructura)
docs/             → esta documentación
docker-compose.yml
.env.example      → plantilla de configuración
```

`@restaurante/shared-types` es la **única fuente de verdad** de enums, formas de
respuesta (DTOs) y etiquetas en español. Mantenerlo sincronizado con
`apps/api/prisma/schema.prisma`.

---

## 5. Backend (NestJS + Prisma)

### 5.1 Anatomía de un módulo (Clean Architecture)

```
apps/api/src/modules/<modulo>/
  domain/            # lógica de negocio pura (sin NestJS ni Prisma)
  application/       # casos de uso / servicios que orquestan el dominio
  infrastructure/    # adaptadores Prisma, "include" compartidos, mappers
  presentation/      # controllers + DTOs (class-validator)
  <modulo>.module.ts
```

Módulos CRUD simples (`tables`, `menu`, `restaurant-settings`, `users`) colapsan
las capas en un servicio delgado; los módulos con reglas ricas (`orders`,
`payments`, `cash-register`) mantienen `domain/`/`application/` explícitos. El
mejor ejemplo de referencia es `modules/orders`.

### 5.2 Flujo de una petición

```
HTTP → JwtAuthGuard (¿token válido? salvo @Public())
     → RolesGuard   (¿rol permitido? según @Roles())
     → ValidationPipe (whitelist + transforma el DTO)
     → Controller   → Service (lógica) → PrismaService → PostgreSQL
     → AuditService.record(...)  (acciones sensibles)
     → respuesta serializada como DTO de shared-types
```

Guards, pipe y prefijo `/api` se configuran globalmente en `src/main.ts`.

### 5.3 Convenciones clave

- **Acceso a datos:** solo vía `PrismaService` (`core/prisma`). La lógica de
  dominio no importa Prisma.
- **Dinero:** se guarda como `Decimal(10,2)` y se expone como `number`. Convierte
  con `common/utils/money.util` (`toNumber`, `round2`). Nunca operes dinero con
  floats sin `round2`.
- **Autorización:** todo requiere sesión por defecto. Abre rutas con `@Public()`,
  restríngelas con `@Roles(UserRole.ADMIN)`. Inyecta el usuario con
  `@CurrentUser()`.
- **Auditoría:** registra acciones sensibles con
  `AuditService.record({ userId, action, entity, entityId, metadata })`. Acepta un
  cliente de transacción para registrar dentro de la misma transacción.
- **Validación:** cada DTO usa `class-validator` con **mensajes en español**.
- **Swagger:** decora con `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`.

### 5.4 Cómo agregar un módulo nuevo

1. Crea `src/modules/<m>/` con su `<m>.module.ts`, controller, service y DTOs.
2. Si necesitas tablas nuevas, edita `prisma/schema.prisma`, crea la migración
   (`prisma:migrate`) y, si expones formas nuevas, añade el DTO a
   `packages/shared-types` y recompílalo.
3. Importa el módulo en `src/app.module.ts`.
4. Usa `PrismaService` y `AuditService` (ambos `@Global()`, no requieren import
   en tu módulo).

---

## 6. Frontend (Angular 18)

### 6.1 Estructura

```
apps/web/src/app/
  core/
    data/        *.api.ts   → clientes tipados por dominio (única vía de acceso a la API)
    services/    auth, theme, notification, api (HttpClient base)
    guards/      authGuard, adminGuard
    interceptors/ authInterceptor (Bearer), errorInterceptor (toasts + refresh)
  shared/
    components/  Icon (SVG Lucide), ToastContainer, DateField (dd/mm/aaaa)
    pipes/       SolesPipe (| soles), EnumLabelPipe (| enumLabel:'...')
  layouts/       MainLayout (sidebar + topbar, drawer móvil)
  features/      una carpeta por pantalla (componentes standalone)
  styles.scss    sistema de diseño (tokens CSS + clases globales)
```

### 6.2 Convenciones del frontend

- **Componentes standalone con archivos separados** `.ts` / `.html` / `.scss`.
  **Nunca** plantillas ni estilos en línea.
- **Señales** (`signal`, `computed`) para el estado; `inject()` para DI;
  control de flujo `@if` / `@for` (no `*ngIf`/`*ngFor`).
- **Sin literales de objeto en plantillas.** Angular no admite `{...}` ni flechas
  con objetos en expresiones; usa **métodos setter** en el componente
  (p. ej. `setEditName($event)`).
- **Acceso a datos solo vía `core/data/*.api.ts`** (Promise-based, `await`). No
  uses `HttpClient` directo en componentes.
- **Errores:** el `errorInterceptor` muestra el mensaje del backend como toast
  automáticamente. En los componentes envuelve los `await` en `try/finally` y
  traga el error con `catch {}`. Usa `NotificationService` **solo para éxitos**.
- **Idioma:** todo el texto visible en **español**; el código en inglés.
- **Dinero:** `{{ valor | soles }}` → `S/ 0.00`. **Fechas:** usa
  `<app-date-field>` (formato **dd/mm/aaaa**, expone ISO `yyyy-mm-dd`).
- **Íconos:** `<app-icon name="...">` (SVG Lucide en `shared/components/icon`).
  **No emojis.** Para agregar un ícono, añade su path a `ICON_PATHS`.

### 6.3 Sistema de diseño

Tokens y primitivas en `src/styles.scss` (variables CSS):

- **Marca:** `--brand-primary` / `--brand-secondary` las inyecta `ThemeService`
  desde `RestaurantSettings` en tiempo de ejecución (toda la app se re-tematiza).
- **Tipografía:** display serif `Fraunces` (marca, encabezados, cifras) + UI sans
  `Plus Jakarta Sans`.
- **Clases reutilizables:** `.btn`/`.btn-primary`/`.btn-ghost`/`.btn-danger`/
  `.btn-success`/`.btn-sm`/`.btn-block`, `.card`/`.card-pad`, `.field`/`.input`/
  `.select`/`.textarea`, `.badge`/`.badge-*`, `.data-table`, `.table-wrap`,
  `.page-head`, `.empty-state`, utilidades de layout (`.flex`, `.grid`, etc.).
- **Responsive (mobile-first, prioridad teléfono del mesero):** el menú lateral se
  vuelve un cajón (drawer) ≤ 900px; objetivos táctiles ≥ 44px en pantallas
  táctiles; tablas anchas en `.table-wrap` (scroll horizontal).

### 6.4 Cómo agregar una pantalla (feature)

1. Crea `features/<x>/<x>.ts` (clase `XPage`, selector `app-x`), `.html`, `.scss`.
2. Consume datos con un servicio `core/data/<dominio>.api.ts` (créalo si no existe,
   inyectando `ApiService`).
3. Registra la ruta (lazy) en `app.routes.ts`; añade `canActivate: [adminGuard]`
   si es solo de administrador.
4. Si va al menú, añade un ítem a `allItems` en `layouts/main-layout/main-layout.ts`
   (con `adminOnly: true` si corresponde).

---

## 7. Contratos compartidos (shared-types)

`packages/shared-types/src/`:

- `enums.ts` — enums sincronizados con Prisma (`UserRole`, `OrderStatus`, …).
- `dtos.ts` — formas de respuesta de la API (montos como `number`, fechas ISO).
- `labels.ts` — mapas de etiquetas en español por enum (usados por `EnumLabelPipe`).

Tras editar, **recompila**: `pnpm --filter @restaurante/shared-types build`.

---

## 8. Reglas de negocio críticas (no romper)

1. **Una mesa = un pedido activo** (estado `ABIERTA`).
2. **Los platos entregados no se eliminan.** Una corrección marca el original como
   `isModified` (excluido del total) y crea un reemplazo `PREPARANDO` enlazado por
   `replacesItemId`. Ver `orders.service.ts → replaceDeliveredItem`.
3. **El pedido cierra solo al pagarse por completo** (`closeIfFullyPaid`); libera
   la mesa.
4. **División de cuenta:** por ítems, en partes iguales (monto fijo) o mixta. Ver
   `billing.service.ts`.
5. **Caja:** una sola sesión abierta a la vez; el monto esperado =
   apertura + ingresos − egresos + ventas en efectivo del periodo.

---

## 9. Pruebas y verificación

- Build de todo: `pnpm build` (valida tipos de api, web y shared-types).
- El build de Angular es AOT: compila **todas** las plantillas, por lo que detecta
  errores de binding/tipos.
- Para una verificación funcional rápida, levanta el stack y prueba el flujo:
  login → abrir pedido → agregar ítems → cocina → dividir → pagar → cierre.

---

## 10. Despliegue

`docker compose up -d` construye y levanta:

- **postgres** (volumen persistente `postgres_data`).
- **api** — multi-stage; en arranque ejecuta `prisma migrate deploy` + seed
  idempotente, luego `node dist/main.js`. Imagen Alpine con `openssl` y
  `binaryTargets` musl para Prisma.
- **web** — build Angular servido por **nginx**, que además reenvía `/api` al
  contenedor `api` (sin CORS).

**Antes de producción:** cambia los secretos JWT y contraseñas del seed, sirve
sobre HTTPS, respalda la base y restringe el acceso de red a Postgres. Ver
[`COMPLIANCE.md`](COMPLIANCE.md).

---

## 11. Solución de problemas

| Síntoma | Causa probable / solución |
|---------|---------------------------|
| `Prisma failed to detect libssl` en Docker | Falta `openssl` o `binaryTargets`. Ya resueltos en `apps/api/Dockerfile` y `schema.prisma`; reconstruye la imagen. |
| La web no encuentra `@restaurante/shared-types` | No se compiló: `pnpm --filter @restaurante/shared-types build`. |
| `EADDRINUSE` al iniciar | Puerto ocupado; cambia `API_PORT`/`WEB_PORT`/`POSTGRES_PORT` en `.env`. |
| Error de plantilla con `{...}` | Angular no admite literales de objeto en plantillas; usa un método setter. |
| 401 en todas las rutas | Falta el token o expiró; el `errorInterceptor` intenta refrescar y, si falla, redirige a `/ingresar`. |
