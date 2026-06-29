# Modelo de datos

Fuente de verdad: [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma).
Los enums se replican en `packages/shared-types/src/enums.ts`. El dinero se guarda
como `Decimal(10,2)` y se expone como `number`.

## Diagrama de relaciones (resumen)

```
User ──< Order (openedBy)        User ──< Payment ──> BillGroup?
User ──< CashSession ──< CashMovement
User ──< AuditLog
User ──< RestaurantMember >── Restaurant

Restaurant ──< Table ──< Order ──< OrderItem ──> Dish ──> MenuCategory
                              ├─< BillGroup ──< BillGroupItem ──> OrderItem
                              └─< Payment
Restaurant ──< MenuCategory
Restaurant ──< Dish
Restaurant ──< CashSession
Restaurant ──< AuditLog

OrderItem ──(self, ItemReplacement)── OrderItem   # original ↔ reemplazo

RestaurantSettings  (fila única, marca del tenant)
```

## Multi-local (`Restaurant`)

Un mismo tenant puede operar **N locales/establecimientos** independientes. Cada
local tiene su propia carta, mesas, pedidos, caja y membresías. La marca visual
es **heredada del tenant** (`RestaurantSettings`) y puede ser **sobreescrita**
en cada `Restaurant` con `primaryColor`, `secondaryColor` y `logoUrl` propios.

- `RestaurantMember` define la membresía de un `User` en un `Restaurant` con
  su **rol por local** (`ADMIN` o `OPERATOR`). Un mismo usuario puede ser
  `ADMIN` en un local y `OPERATOR` en otro.
- Un usuario con rol global `ADMIN` y **sin** `RestaurantMember` es tratado como
  **superadmin**: ve todos los locales y puede operar cualquiera.

### Scoping por local

Las entidades operativas (`Table`, `MenuCategory`, `Dish`, `Order`, `CashSession`,
`CashMovement`, `AuditLog`) tienen un `restaurantId` obligatorio. El backend
filtra todas las queries por el `restaurantId` activo, que se resuelve desde:

- header `X-Restaurant-Id`, o
- query param `?restaurantId=` (alternativa para clientes no web).

El frontend (`restaurantInterceptor`) lo inyecta automáticamente a partir del
local elegido en el `RestaurantSelector` del topbar.

### Unicidad por local

- `Table.number` — único dentro del local (`@@unique([restaurantId, number])`).
- `MenuCategory.name` — único dentro del local (`@@unique([restaurantId, name])`).

## Enumeraciones

| Enum | Valores |
|------|---------|
| `UserRole` | `ADMIN`, `OPERATOR` |
| `TableStatus` | `LIBRE`, `OCUPADA`, `RESERVADA`, `FUERA_DE_SERVICIO` |
| `OrderStatus` | `ABIERTA`, `CERRADA`, `ANULADA` |
| `OrderItemStatus` | `PENDIENTE`, `PREPARANDO`, `ENTREGADO` |
| `PaymentMethod` | `EFECTIVO`, `YAPE`, `PLIN`, `TARJETA` |
| `CashMovementType` | `INGRESO`, `EGRESO` |
| `CashSessionStatus` | `ABIERTA`, `CERRADA` |

## Entidades

### User
Personal del sistema. `passwordHash` (bcrypt, costo 12) nunca se serializa.
Campos: `email` (único), `name`, `role` (rol **global**; el rol por local vive
en `RestaurantMember.role`), `active`. Relaciones inversas: pedidos abiertos,
pagos, sesiones/movimientos de caja, auditoría, membresías.

### RestaurantSettings
Fila única del tenant: `name`, `logoUrl`, `primaryColor`, `secondaryColor`,
`address`, `phone`, `businessInfo`, `currency`. Sirve como **marca por defecto**
que cada `Restaurant` puede sobreescribir. El front la lee de forma **pública**
para tematizar antes del login.

### Restaurant
Local / establecimiento. `slug` (único, URL-safe), `name`, `address?`, `phone?`,
`primaryColor?`, `secondaryColor?`, `logoUrl?` (opcionales: si son null, el
frontend usa los del tenant), `active`. Tabla única por tenant.

### RestaurantMember
Membresía de un `User` en un `Restaurant`. `role` define el permiso dentro del
local (puede ser distinto del rol global del usuario). `active` (baja lógica).
Único por `(userId, restaurantId)`.

### Table
Mesa física: `restaurantId`, `number` (único dentro del local), `name`,
`capacity`, `status`, posición opcional (`posX`, `posY`) para la vista de salón,
`active` (baja lógica).

### MenuCategory / Dish
- **MenuCategory:** `restaurantId`, `name` (único dentro del local), `sortOrder`,
  `isSystem` (categorías base del seed, no eliminables), `active`.
- **Dish:** `restaurantId`, `name`, `description?`, `price` (Decimal),
  `imageUrl?`, `active`, `categoryId`. El plato no se borra si tiene historial:
  se desactiva.

### Order / OrderItem
- **Order:** `restaurantId` (denormalizado desde la mesa para queries/scopes
  rápidos), `code` (correlativo), `tableId`, `status`, `notes?`, `openedById`,
  `openedAt`, `closedAt?`. Relaciones: `items`, `billGroups`, `payments`.
- **OrderItem:** `dishId`, `unitPrice` (**snapshot** del precio al pedir),
  `quantity`, `notes?`, `status`. Protección de platos entregados:
  - `isModified` — el original corregido (se **excluye del total**).
  - `replacesItemId` (self-relation `ItemReplacement`) — enlaza
    reemplazo↔original.
  - `deliveredAt` — sello al pasar a `ENTREGADO`.

### BillGroup / BillGroupItem (división de cuenta)
- **BillGroup:** `orderId`, `name` (etiqueta libre sin PII, p. ej. "Cliente A"),
  `fixedAmount?` (si está, debe ese monto — modo partes iguales; si es null, se
  calcula desde los ítems asignados).
- **BillGroupItem:** asigna una porción (`quantity`) de un `OrderItem` a un grupo.
  Único por `(billGroupId, orderItemId)`.

### Payment
`orderId`, `billGroupId?` (pago dividido o global), `method`, `amount`,
`reference?` (n.º de operación de Yape/Plin/tarjeta), `createdById`. Los pagos son
la **fuente de verdad del dinero cobrado** (los reportes suman pagos).

### CashSession / CashMovement
- **CashSession:** `restaurantId`, `openingAmount`, `expectedAmount?`,
  `actualAmount?`, `difference?`, `status`, `openedById`, `openedAt`, `closedAt?`.
  Una sola `ABIERTA` **por local** (no global).
- **CashMovement:** `sessionId`, `restaurantId` (denormalizado), `type`
  (INGRESO/EGRESO), `amount`, `description`.

### AuditLog
`userId?`, `restaurantId?` (local al que aplica la acción; null para acciones
globales), `action` (p. ej. `PAYMENT_REGISTERED`), `entity`, `entityId?`,
`metadata?` (JSON), `createdAt`. Bitácora de acciones sensibles.

## Cálculos financieros (lógica pura)

Implementados en `apps/api/src/modules/orders/domain/order-calculator.ts`:

- **Total del pedido** = Σ subtotales de ítems vigentes (excluye `isModified`).
- **Subtotal de ítem** = `round2(unitPrice × quantity)`.
- **Pagado** = Σ `Payment.amount`. **Saldo** = total − pagado.
- **Grupo (split):** total = `fixedAmount` si existe, si no Σ ítems asignados;
  pagado = Σ pagos del grupo.
- **Totalmente pagado** = pagado + 0.01 ≥ total (con total > 0) → cierra el pedido.
- **Caja esperada** = apertura + ingresos − egresos + ventas en efectivo del periodo.

## Migraciones

`apps/api/prisma/migrations/`. Crear en dev con
`pnpm --filter @restaurante/api prisma:migrate`; aplicar en prod con
`prisma migrate deploy` (lo hace el entrypoint de Docker).
