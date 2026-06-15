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

- **User** — administrador u operador (mesero). Máximo 2 roles.
- **RestaurantSettings** — fila única de marca y datos del negocio.
- **Table** — mesa física con estado (Libre/Ocupada/Reservada/Fuera de servicio).
- **MenuCategory / Dish** — carta del restaurante.
- **Order / OrderItem** — una mesa tiene **un** pedido activo; el pedido tiene ítems.
- **BillGroup / BillGroupItem** — división de cuenta (split) por ítems o monto fijo.
- **Payment** — pagos parciales/combinados por método (Efectivo/Yape/Plin/Tarjeta).
- **CashSession / CashMovement** — control de caja diario (apertura/cierre).
- **AuditLog** — bitácora de acciones sensibles (usuario, acción, timestamp).

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
- **Autenticación segura**: JWT de acceso de vida corta + refresh; secretos por
  entorno.
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
