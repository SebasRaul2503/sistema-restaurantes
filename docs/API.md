# Referencia de la API

Todas las rutas viven bajo el prefijo **`/api`**. Documentación interactiva
(OpenAPI) en **`/api/docs`** (Swagger). Salvo las marcadas como _Público_, toda
ruta requiere `Authorization: Bearer <accessToken>`.

**Roles:** _Cualquiera_ = administrador u operador autenticado · _ADMIN_ = solo
administrador. Los montos se envían/reciben como `number` (soles); las fechas como
ISO (`yyyy-mm-dd` o ISO datetime).

---

## Autenticación — `/auth`

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/auth/login` | Público | Inicia sesión. Body `{ email, password }` → `{ accessToken, refreshToken, user }`. |
| POST | `/auth/refresh` | Público | Renueva tokens. Body `{ refreshToken }`. |
| GET  | `/auth/me` | Cualquiera | Usuario + locales disponibles + local activo. Respuesta: `{ user, restaurants, activeRestaurantId, isSuperAdmin }`. Si se envía el header `X-Restaurant-Id`, se incluye en `activeRestaurantId` (verificado). |

## Mis locales — `/my-restaurants` (Cualquiera)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/my-restaurants` | Locales disponibles para el usuario. Si es superadmin (ADMIN sin membresías) devuelve todos; si no, solo donde tiene membresía activa. |

## Locales — `/restaurants` (ADMIN, salvo los marcados)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/restaurants` | Listar **todos** los locales. |
| POST | `/restaurants` | Crear `{ slug, name, address?, phone?, primaryColor?, secondaryColor?, logoUrl? }`. |
| GET | `/restaurants/:id` | Obtener un local. |
| PATCH | `/restaurants/:id` | Actualizar. Acepta `null` en campos de marca para limpiar el override. |
| GET | `/restaurants/:id/members` | Listar miembros de un local. |
| POST | `/restaurants/:id/members` | Agregar o reasignar `{ userId, role }`. |
| PATCH | `/restaurants/:id/members/:memberId` | Cambiar rol/activo `{ role?, active? }`. |
| GET | `/restaurants/:id/theme` | Marca efectiva del local (override o tenant). |

## Usuarios — `/users` (ADMIN)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/users` | Listar usuarios. |
| GET | `/users/:id` | Obtener un usuario. |
| POST | `/users` | Crear `{ email, name, password, role }`. |
| PATCH | `/users/:id` | Actualizar `{ name?, password?, role?, active? }`. |
| DELETE | `/users/:id` | Desactivar (baja lógica; no permite autodesactivarse). |

## Configuración del restaurante — `/settings`

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/settings` | Público | Marca y datos (para tematizar antes del login). |
| PATCH | `/settings` | ADMIN | Actualizar marca/negocio. |

## Mesas — `/tables`

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/tables` | Cualquiera | Listar mesas **del local activo** (header `X-Restaurant-Id`). |
| GET | `/tables/:id` | Cualquiera | Obtener una mesa del local activo. |
| POST | `/tables` | ADMIN | Crear `{ number, name?, capacity?, posX?, posY? }` en el local activo. |
| PATCH | `/tables/:id` | ADMIN | Actualizar campos. |
| PATCH | `/tables/:id/status` | Cualquiera | Cambiar estado `{ status }`. |
| DELETE | `/tables/:id` | ADMIN | Desactivar (baja lógica). |

## Carta — `/menu`

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/menu/categories` | Cualquiera | Listar categorías del local activo. |
| POST | `/menu/categories` | ADMIN | Crear categoría en el local activo. |
| PATCH | `/menu/categories/:id` | ADMIN | Actualizar categoría. |
| DELETE | `/menu/categories/:id` | ADMIN | Eliminar (bloqueada si es del sistema o tiene platos). |
| GET | `/menu/dishes` | Cualquiera | Listar platos del local activo. Query: `categoryId?`, `active?`. |
| GET | `/menu/dishes/:id` | Cualquiera | Obtener un plato del local activo. |
| POST | `/menu/dishes` | ADMIN | Crear `{ name, price, categoryId, description?, imageUrl? }`. |
| PATCH | `/menu/dishes/:id` | ADMIN | Actualizar plato. |
| DELETE | `/menu/dishes/:id` | ADMIN | Desactivar (preserva historial). |

## Pedidos — `/orders`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/orders/active` | Resumen de pedidos abiertos. |
| GET | `/orders/table/:tableId/active` | Pedido activo de una mesa (o null). |
| GET | `/orders/:id` | Detalle del pedido (ítems, grupos, pagos, totales). |
| POST | `/orders` | Abrir pedido `{ tableId, notes? }`. |
| POST | `/orders/:id/items` | Agregar plato `{ dishId, quantity, notes? }`. |
| PATCH | `/orders/items/:itemId` | Editar ítem **no entregado** `{ quantity?, notes? }`. |
| DELETE | `/orders/items/:itemId` | Eliminar ítem **no entregado** (los entregados no se borran). |
| POST | `/orders/items/:itemId/replace` | Corregir un ítem **entregado** (crea reemplazo) `{ dishId?, quantity?, reason?, notes? }`. |
| POST | `/orders/:id/cancel` | Anular pedido sin pagos. |

## División de cuenta (split)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/orders/:id/split/even` | Partes iguales `{ parts, names? }`. |
| POST | `/orders/:id/split/items` | Por ítems `{ groups: [{ name, items: [{ orderItemId, quantity }] }] }`. |
| POST | `/orders/:id/bill-groups` | Crear grupo (mixto) `{ name, fixedAmount? }`. |
| DELETE | `/orders/:id/split` | Quitar toda la división. |
| POST | `/bill-groups/:groupId/items` | Asignar ítem `{ orderItemId, quantity }`. |
| DELETE | `/bill-group-items/:groupItemId` | Quitar ítem de un grupo. |
| DELETE | `/bill-groups/:groupId` | Eliminar grupo (sin pagos). |

## Pagos — `/orders/:orderId/payments`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/orders/:orderId/payments` | Listar pagos del pedido. |
| POST | `/orders/:orderId/payments` | Registrar pago `{ method, amount, billGroupId?, reference? }`. Cierra el pedido si queda saldado. |

## Cocina — `/kitchen`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/kitchen/queue` | Cola de preparación (PENDIENTE/PREPARANDO, FIFO). |
| PATCH | `/kitchen/items/:itemId/status` | Cambiar estado `{ status }` (valida transiciones). |

## Caja — `/cash-register`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/cash-register/current` | Sesión abierta actual (o null). |
| GET | `/cash-register/history` | Sesiones cerradas. Query: `limit?`. |
| POST | `/cash-register/open` | Abrir `{ openingAmount }`. |
| POST | `/cash-register/movements` | Ingreso/egreso `{ type, amount, description }`. |
| POST | `/cash-register/close` | Cerrar `{ actualAmount, notes? }` (calcula diferencia). |

## Reportes — `/reports`

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/reports/dashboard` | Cualquiera | Tarjetas del panel (mesas, ítems, ingresos hoy/mes). |
| GET | `/reports/revenue` | ADMIN | Ingresos por periodo. Query: `period=daily\|weekly\|monthly`, `from?`, `to?`. |
| GET | `/reports/top-dishes` | ADMIN | Platos más vendidos. Query: `from?`, `to?`, `limit?`. |
| GET | `/reports/top-tables` | ADMIN | Mesas más usadas. |
| GET | `/reports/payments-by-method` | ADMIN | Ingresos por método de pago. |

## Auditoría — `/audit` (ADMIN)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/audit` | Bitácora reciente. Query: `limit?`, `entity?`. |

---

> Las formas exactas de request/response están tipadas en
> `packages/shared-types/src/dtos.ts` y documentadas en Swagger (`/api/docs`).
