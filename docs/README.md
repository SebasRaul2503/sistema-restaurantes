# Documentación — Sistema de Gestión de Restaurantes

Punto de partida para entender y mantener el proyecto.

| Documento | Para qué sirve |
|-----------|----------------|
| [DEVELOPMENT.md](DEVELOPMENT.md) | **Empieza aquí.** Puesta en marcha, comandos, estructura, convenciones de backend y frontend, cómo agregar un módulo/pantalla, despliegue y solución de problemas. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Decisiones de arquitectura: stack, Clean Architecture, seguridad, i18n, despliegue. |
| [DATA-MODEL.md](DATA-MODEL.md) | Entidades, relaciones, enums, reglas de negocio y cálculos financieros. |
| [API.md](API.md) | Referencia de endpoints por módulo (acceso y payloads). Swagger en `/api/docs`. |
| [COMPLIANCE.md](COMPLIANCE.md) | Cumplimiento de la Ley N° 29733 (protección de datos) y recomendaciones de producción. |

Ver también el [`README.md`](../README.md) raíz (resumen y arranque rápido) y
[`CLAUDE.md`](../CLAUDE.md) (guía condensada de reglas para agentes).

## Mapa rápido del repositorio

```
apps/api    → backend NestJS + Prisma (modules/, prisma/)
apps/web    → frontend Angular (core/, shared/, layouts/, features/)
packages/shared-types → contratos compartidos (enums, DTOs, etiquetas)
docs/       → esta documentación
docker-compose.yml, .env.example
```
