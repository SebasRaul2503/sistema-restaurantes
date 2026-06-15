# Guía para desarrolladores (y agentes) — Sistema de Gestión de Restaurantes

Monorepo pnpm: **NestJS + Prisma + PostgreSQL** (api) y **Angular 18** (web), con
contratos compartidos en `packages/shared-types`. Todo lo visible al usuario está
en **español**; el código en **inglés**.

## Comandos clave

```bash
pnpm install
docker compose up -d postgres                      # DB local
pnpm --filter @restaurante/api prisma:generate      # cliente Prisma
pnpm --filter @restaurante/api prisma:migrate       # migraciones (dev)
pnpm --filter @restaurante/api prisma:seed          # datos de ejemplo
pnpm dev:api                                        # NestJS :3000 (Swagger /api/docs)
pnpm dev:web                                        # Angular :4200 (proxy /api → :3000)
pnpm build                                          # build de todos los paquetes
docker compose up -d                                # stack completo
```

## Reglas de arquitectura (mantener)

- **`packages/shared-types` es la frontera de contrato.** Enums, DTOs de respuesta
  y etiquetas en español viven aquí y los consumen api y web. Tras editar, ejecutar
  `pnpm --filter @restaurante/shared-types build` (la web/api resuelven el paquete
  compilado en `dist`).
- **Backend (Clean Architecture):** cada módulo en `apps/api/src/modules/<m>` separa
  `presentation` (controllers/dto), `application` (use-cases/servicios),
  `domain` (lógica pura) e `infrastructure` (Prisma). La lógica de negocio no
  depende de Prisma ni de NestJS. Los repositorios/queries de Prisma se aíslan.
- **Dinero:** se guarda como `Decimal(10,2)`; se expone como `number`. Usar
  `common/utils/money.util` (`toNumber`, `round2`). En el front, `| soles`.
- **Guards globales:** `JwtAuthGuard` + `RolesGuard` aplican a toda la API. Rutas
  públicas con `@Public()`; restringir con `@Roles(UserRole.ADMIN)`.
- **Auditoría:** registrar acciones sensibles con `AuditService.record(...)`.

## Reglas del frontend (mantener)

- **Componentes standalone con archivos separados** `.ts` / `.html` / `.scss`.
  **Nunca** plantillas ni estilos en línea.
- **Sin literales de objeto en plantillas.** Angular no los admite en expresiones
  (`(ngModelChange)="x.update(o => ({...o}))"` falla). Usar métodos setter en el
  componente.
- **Señales** para estado; `inject()` para DI; control de flujo `@if`/`@for`.
- **Acceso a datos** solo vía los servicios `core/data/*.api.ts` (no `HttpClient`
  directo en componentes). Los errores se muestran solos vía `errorInterceptor`;
  usar `NotificationService` solo para éxitos.
- **Sistema de diseño:** tokens en `src/styles.scss` (variables CSS). La marca
  (`--brand-*`) la inyecta `ThemeService` desde la configuración. Reusar clases
  globales (`.btn`, `.card`, `.badge`, `.data-table`, `.field`/`.input`). Íconos
  vía `<app-icon name="...">` (SVG Lucide), **no emojis**.

## Reglas de negocio críticas

- Una mesa tiene **un** pedido activo.
- **Platos entregados no se eliminan**: se corrigen con un reemplazo (el original
  queda `isModified` y se excluye del total). Ver `orders.service.ts`.
- El pedido **cierra solo al pagarse por completo** (`closeIfFullyPaid`).
- División de cuenta: por ítems, partes iguales o mixta (`billing.service.ts`).
