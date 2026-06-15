# Modelo de datos

Fuente de verdad: [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma).
Los enums se replican en `packages/shared-types/src/enums.ts`. El dinero se guarda
como `Decimal(10,2)` y se expone como `number`.

## Diagrama de relaciones (resumen)

```
User ──< Order (openedBy)        User ──< Payment ──> BillGroup? 
User ──< CashSession ──< CashMovement
User ──< AuditLog

Table ──< Order ──< OrderItem ──> Dish ──> MenuCategory
                 ├─< BillGroup ──< BillGroupItem ──> OrderItem
                 └─< Payment

OrderItem ──(self, ItemReplacement)── OrderItem   # original ↔ reemplazo

RestaurantSettings  (fila única, configuración de marca)
```

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
Campos: `email` (único), `name`, `role`, `active`. Relaciones inversas: pedidos
abiertos, pagos, sesiones/movimientos de caja, auditoría.

### RestaurantSettings
Fila única de marca y negocio: `name`, `logoUrl`, `primaryColor`,
`secondaryColor`, `address`, `phone`, `businessInfo`, `currency`. El front la lee
de forma **pública** para tematizar antes del login.

### Table
Mesa física: `number` (único), `name`, `capacity`, `status`, posición opcional
(`posX`, `posY`) para la vista de salón, `active` (baja lógica).

### MenuCategory / Dish
- **MenuCategory:** `name` (único), `sortOrder`, `isSystem` (categorías base del
  seed, no eliminables), `active`.
- **Dish:** `name`, `description?`, `price` (Decimal), `imageUrl?`, `active`,
  `categoryId`. El plato no se borra si tiene historial: se desactiva.

### Order / OrderItem
- **Order:** `code` (correlativo legible), `tableId`, `status`, `openedById`,
  `openedAt`, `closedAt?`. Relaciones: `items`, `billGroups`, `payments`.
- **OrderItem:** `dishId`, `unitPrice` (**snapshot** del precio al pedir),
  `quantity`, `notes?`, `status`. Protección de platos entregados:
  - `isModified` — el original corregido (se **excluye del total**).
  - `replacesItemId` (self-relation `ItemReplacement`) — enlaza reemplazo↔original.
  - `deliveredAt` — sello al pasar a `ENTREGADO`.

### BillGroup / BillGroupItem (división de cuenta)
- **BillGroup:** `name` (etiqueta libre sin PII, p. ej. "Cliente A"),
  `fixedAmount?` (si está, debe ese monto — modo partes iguales; si es null, se
  calcula desde los ítems asignados).
- **BillGroupItem:** asigna una porción (`quantity`) de un `OrderItem` a un grupo.
  Único por `(billGroupId, orderItemId)`.

### Payment
`orderId`, `billGroupId?` (pago dividido o global), `method`, `amount`,
`reference?` (n.º de operación de Yape/Plin/tarjeta), `createdById`. Los pagos son
la **fuente de verdad del dinero cobrado** (los reportes suman pagos).

### CashSession / CashMovement
- **CashSession:** `openingAmount`, `expectedAmount?`, `actualAmount?`,
  `difference?`, `status`, `openedById`, `openedAt`, `closedAt?`. Solo una
  `ABIERTA` a la vez.
- **CashMovement:** `type` (INGRESO/EGRESO), `amount`, `description`.

### AuditLog
`userId?`, `action` (p. ej. `PAYMENT_REGISTERED`), `entity`, `entityId?`,
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
