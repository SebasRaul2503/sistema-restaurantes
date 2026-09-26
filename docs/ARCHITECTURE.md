# Arquitectura del Sistema de Gestión de Restaurantes

> Documento de decisiones de arquitectura (ADR consolidado). Audiencia: cualquier
> desarrollador que mantenga este sistema en los próximos años.

## 1. Objetivo del producto

Plataforma de **gestión de operaciones** para restaurantes pequeños y medianos en
Perú (cevicherías, pollerías, cafés, menús). **No es un POS**: se enfoca en mesas,
pedidos, flujo de cocina, cobros, división de cuentas y control de caja diario.

## 2. Stack tecnológico

| Capa            | Tecnología                                  | Motivo |
|-----------------|---------------------------------------------|--------|
| Monorepo        | pnpm workspaces                             | Comparte tipos entre web y api sin publicar paquetes. |
| Backend         | NestJS 10 + TypeScript                      | Modular, DI nativa, ideal para Clean Architecture. |
| ORM             | Prisma 5                                    | Tipado, migraciones declarativas, una sola fuente de verdad del modelo de datos. |
| Base de datos   | PostgreSQL 16                               | Transaccional, robusta, gratuita. |
| Frontend        | Angular 18 (standalone + signals)           | Enterprise, mantenible, sin NgModules. |
| Auth            | JWT (access + refresh) + RBAC               | Estándar, sin estado en el servidor. |
| Docs API        | Swagger / OpenAPI                           | `@nestjs/swagger` autogenerado desde DTOs. |
| Infra           | Docker Compose                              | `docker compose up -d` levanta todo. |

## 3. Estructura del monorepo

```
apps/
  api/        # NestJS — backend
  web/        # Angular — frontend
packages/
  shared-types/  # Contratos (DTOs/enums/interfaces) compartidos web ↔ api
docker/
  postgres/   # init scripts
docs/         # documentación y ADRs
```

`@restaurante/shared-types` es la **frontera de contrato**: enums y formas de
respuesta de la API viven aquí y los consumen ambos lados. Evita drift entre
backend y frontend.

## 4. Clean Architecture en el backend

Cada módulo de `apps/api/src/modules/<modulo>` separa responsabilidades:

```
<modulo>/
  domain/            # Entidades y reglas de negocio puras (sin NestJS ni Prisma)
    entities/
    value-objects/
  application/        # Casos de uso — orquestan el dominio
    use-cases/
    ports/            # Interfaces de repositorio (puertos)
  infrastructure/     # Implementaciones técnicas
    repositories/     # Adaptadores Prisma que implementan los puertos
    mappers/          # Prisma model <-> entidad de dominio
  presentation/       # Capa HTTP
    controllers/
    dto/
  <modulo>.module.ts
```

**Regla de dependencia:** `presentation → application → domain`. La
infraestructura implementa puertos definidos en `application`. La lógica de
negocio **no** depende de Prisma ni de decoradores de NestJS, lo que la hace
testeable de forma aislada.

> Pragmatismo: módulos puramente CRUD (p. ej. `tables`, `menu`) pueden colapsar
> `domain`/`application` en servicios delgados cuando una capa completa sería
> sobreingeniería. Los módulos con reglas ricas (`orders`, `payments`,
> `cash-register`) sí mantienen casos de uso explícitos. Esta decisión está
> documentada por módulo en su README local cuando aplica.

## 5. Modelo de datos (resumen)

Ver `apps/api/prisma/schema.prisma` como fuente de verdad. Entidades clave:

- **User** — administrador u operador (mesero). Máximo 2 roles globales.
- **RestaurantSettings** — fila única de marca y datos del **tenant** (no de un
  local concreto).
- **Restaurant** — local/establecimiento. Tiene su propia carta, mesas, pedidos
  y caja. La marca visual puede sobreescribir la del tenant.
- **RestaurantMember** — membresía de un usuario en un local con rol
  (`ADMIN` o `OPERATOR`) por local.
- **Table** — mesa física con estado (Libre/Ocupada/Reservada/Fuera de
  servicio). `number` único dentro del local.
- **MenuCategory / Dish** — carta del local.
- **Order / OrderItem** — una mesa tiene **un** pedido activo; el pedido tiene
  ítems.
- **BillGroup / BillGroupItem** — división de cuenta (split) por ítems o
  monto fijo.
- **Payment** — pagos parciales/combinados por método (Efectivo/Yape/Plin/
  Tarjeta).
- **CashSession / CashMovement** — control de caja diario (apertura/cierre) por
  local.
- **AuditLog** — bitácora de acciones sensibles (usuario, acción, timestamp,
  local).

## 5.1 Multi-local (sucursales)

El sistema soporta **N locales** bajo un mismo tenant (instalación). El
mecanismo se resume en cinco puntos:

1. **Identidad del local.** `Restaurant` tiene `slug` (URL-safe) y `name`; las
   tablas operativas tienen `restaurantId` obligatorio.
2. **Membresía con rol local.** `RestaurantMember.role` puede ser distinto
   del rol global del usuario. Un usuario puede ser `ADMIN` en un local y
   `OPERATOR` en otro.
3. **Superadmins.** Un `User` con rol global `ADMIN` y sin membresía es
   "superadmin": ve y puede operar todos los locales.
4. **Scoping en el backend.** `LocalGuard` (guard global) resuelve el
   `restaurantId` desde el header `X-Restaurant-Id` y valida que el usuario
   pertenezca al local (o sea superadmin). Todos los servicios reciben
   `restaurantId` y filtran/insertan por él. `AuditService` registra el
   `restaurantId` cuando aplica.
5. **Selección en el frontend.** `ActiveRestaurantService` mantiene el local
   activo en una signal persistida en `localStorage`. El
   `restaurantInterceptor` inyecta el header automáticamente. Si el usuario
   tiene más de un local y ninguno activo, `requireLocalGuard` lo redirige a
   `/seleccionar-local`.

## 6. Reglas de negocio críticas

1. **Una mesa = un pedido activo.** Restricción única parcial sobre pedidos
   `ABIERTA` por mesa.
2. **Protección de platos entregados.** Un `OrderItem` en estado `ENTREGADO` no se
   elimina. Una corrección marca el original como `isModified` (excluido del total)
   y crea un ítem de reemplazo en estado `PREPARANDO`, enlazado por
   `replacesItemId`. Se conserva la traza completa.
3. **El pedido cierra solo cuando está totalmente pagado.** El saldo se recalcula
   con cada pago.
4. **División de cuenta** soporta: por ítems seleccionados, en partes iguales
   (monto fijo por grupo) y escenarios mixtos.

## 7. Seguridad y Ley N° 29733 (Protección de Datos Personales)

- **Minimización**: no se recolectan datos personales de comensales. Los pedidos
  se asocian a mesas, no a clientes identificados. Los grupos de cuenta usan
  etiquetas libres ("Cliente A") sin PII.
- **Hashing de contraseñas** con `bcrypt` (cost 12). Nunca se almacenan en claro.
- **Autenticación con dos tokens**:
  - **Access token** (vida corta, 15 min): viaja en memoria del cliente (signal
    en `AuthService`). Se envía en cada request vía header `Authorization:
    Bearer …`. Se pierde al cerrar la pestaña.
  - **Refresh token** (vida larga, 7 días): viaja en **cookie httpOnly** que el
    JavaScript del cliente **no puede leer**. La cookie tiene `Path=/api/auth`
    (alcance limitado), `SameSite=Strict` en producción (`Lax` en dev) y `Secure`
    en producción.
  - **Rotación por jti**: cada `POST /api/auth/refresh` emite un refresh nuevo y
    revoca el anterior en la tabla `refresh_tokens`. Un refresh filtrado queda
    anulado en cuanto se detecte el siguiente uso.
  - **Logout total**: `POST /api/auth/logout` revoca el refresh presentado y
    limpia la cookie.
- **Sin persistencia en cliente**: nada de tokens, user, ni `me` se guarda en
  `localStorage` ni `sessionStorage`. XSS no puede exfiltrar nada de sesión.
  Al recargar la pestaña, el frontend intenta `bootstrap()` (refresh con cookie);
  si la cookie sigue viva, login silencioso; si no, redirect a `/ingresar`.
- **RBAC**: `@Roles()` + guard global. El operador solo accede a operación diaria.
- **Auditoría** de acciones sensibles (`AuditLog`).
- **Validación de entrada** con `class-validator` en todos los DTOs + whitelist
  global que descarta campos no declarados.
- **Exposición mínima**: los `User` nunca serializan su `passwordHash`.
- Ver `docs/COMPLIANCE.md` para el detalle de cumplimiento.

## 8. Internacionalización

Toda la interfaz visible está en **español** (menús, botones, validaciones,
reportes, estados vacíos). El **código** (identificadores, clases, DTOs) está en
**inglés**. Los enums se almacenan en inglés/neutro y se traducen en la capa de
presentación con mapas de etiquetas.

## 9. Despliegue

`docker compose up -d` levanta Postgres, API y Web. La API ejecuta migraciones y
seed en el arranque (script de entrypoint). Configuración por variables de entorno
(`.env`). Sin pasos manuales adicionales.
