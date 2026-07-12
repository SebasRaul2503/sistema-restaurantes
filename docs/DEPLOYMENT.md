# Despliegue

Esta guía cubre los dos modos de despliegue soportados:

1. **Desarrollo / Demo** — `docker-compose.yml`, expone los puertos al host directamente.
2. **Producción** — `docker-compose.prod.yml`, detrás de un reverse-proxy Traefik ya existente (HTTPS automático con Let's Encrypt).

## 1. Desarrollo / Demo

```bash
cp .env.example .env
docker compose up -d --build
```

URLs:

- Web: http://localhost:4200
- API + Swagger: http://localhost:3000/api/docs

`docker-compose.yml` publica los puertos de Postgres (5432), API (3000) y Web (4200) al host. Útil para desarrollo local.

## 2. Producción con Traefik

`docker-compose.prod.yml` está pensado para correr detrás de un reverse-proxy Traefik compartido en el host. Solo el frontend (`web`) se expone a Internet. La API queda en una red interna y es accesible desde el frontend vía `/api/*` (el nginx interno reenvía).

### 2.1 Prerrequisitos en el host

1. **Traefik ya corriendo** en el host, escuchando en una red Docker llamada `traefik-public`:

   ```bash
   docker network create traefik-public
   ```

   Tu `traefik.yml` debe declarar al menos:

   ```yaml
   entryPoints:
     web:
       address: ':80'
     websecure:
       address: ':443'

   certificatesResolvers:
     letsencrypt:
       acme:
         email: ops@tudominio.com
         storage: /letsencrypt/acme.json
         httpChallenge:
           entryPoint: web
       tlsChallenge: {}

   networks:
     traefik-public:
       external: true
   ```

2. **DNS** apuntando `DOMAIN` (ej. `app.tudominio.com`) a la IP pública del host donde corre Docker/Traefik.

3. **Puertos 80 y 443** abiertos en el firewall del host (HTTP para el challenge de Let's Encrypt y la redirección a HTTPS).

### 2.2 Configurar `.env`

```bash
cp .env.example .env
```

Variables obligatorias para producción:

```dotenv
POSTGRES_USER=restaurante
POSTGRES_PASSWORD=<contraseña_fuerte_de_postgres>
POSTGRES_DB=restaurante

JWT_ACCESS_SECRET=<genera_con_openssl_rand_base64_48>
JWT_REFRESH_SECRET=<genera_con_openssl_rand_base64_48>

CORS_ORIGIN=https://app.tudominio.com
COOKIE_SECURE=true

DOMAIN=app.tudominio.com
ACME_EMAIL=ops@tudominio.com

SEED_ADMIN_EMAIL=admin@restaurante.pe
SEED_ADMIN_PASSWORD=<contraseña_inicial_del_admin>
SEED_ADMIN_NAME=Administrador
```

Generar secretos JWT:

```bash
openssl rand -base64 48   # ejecutar dos veces
```

### 2.3 Levantar

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Servicios que quedan corriendo:

| Servicio | Puerto publicado | Red |
|---|---|---|
| `restaurante_postgres` | — (interno) | `restaurante-internal` |
| `restaurante_api` | — (interno, solo accesible desde `restaurante_web`) | `restaurante-internal` |
| `restaurante_web` | 80 (via Traefik) | `traefik-public`, `restaurante-internal` |

### 2.4 Flujo de una request

```
Cliente                     Traefik                    restaurante_web         restaurante_api
   │   GET /api/auth/me         │                              │                          │
   ├──────────────────────────►│  Host: app.tudominio.com:443  │                          │
   │                           ├─────────────────────────────►                          │
   │                           │  GET /api/auth/me            │                          │
   │                           │  (sin Host header reescrito) │                          │
   │                           ├──────────────────────────────►                          │
   │                           │                              │  GET /api/auth/me        │
   │                           │                              ├──────────────────────────►
   │                           │                              │  (X-Restaurant-Id del    │
   │                           │                              │   cookie si está         │
   │                           │                              │   presente)              │
```

El frontend Angular (nginx interno) hace proxy de `/api/*` al servicio `api:3000` con `proxy_set_header Host $host` (preserva el `Host` para que Traefik + CORS funcionen).

### 2.5 HTTPS y la cookie httpOnly

Con Traefik + Let's Encrypt, todas las requests llegan por HTTPS. La cookie de refresh debe ser `Secure`. Esto se configura automáticamente porque:

- `COOKIE_SECURE=true` se pasa al backend en producción.
- O porque Traefik añade `X-Forwarded-Proto: https` y el backend lo detecta en `cookie.ts`.

### 2.6 Escalado / Mantenimiento

```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f api

# Reiniciar solo un servicio (p. ej. tras cambiar variables)
docker compose -f docker-compose.prod.yml restart api

# Backup de la base de datos
docker exec restaurante_postgres pg_dump -U restaurante restaurante > backup-$(date +%F).sql

# Migrar schema (las migraciones se ejecutan automáticamente en el entrypoint)
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# Rotar JWT secrets: cortar todas las sesiones activas (los usuarios
# tendrán que hacer login de nuevo)
docker compose -f docker-compose.prod.yml restart api
```

### 2.7 Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| 502 Bad Gateway al entrar al sitio | `restaurante_web` no arrancó | `docker compose -f docker-compose.prod.yml logs web` |
| Cookie de refresh no se persiste | `CORS_ORIGIN` no coincide con el dominio real, o falta `Secure` | Revisa que `CORS_ORIGIN=https://app.tudominio.com` y que `COOKIE_SECURE=true` o que Traefik pase `X-Forwarded-Proto: https` |
| Let's Encrypt no emite el certificado | DNS no apunta al host, o puerto 80 bloqueado | `dig app.tudominio.com`, `curl -I http://app.tudominio.com/.well-known/acme-challenge/test` |
| `network traefik-public not found` | Red externa no creada | `docker network create traefik-public` |
| Sesión se pierde al recargar | `JWT_*` secrets cambiados entre deployments; o cookie `Secure` no se está enviando | Verifica `CORS_ORIGIN` y `Secure` flag en DevTools → Application → Cookies |
