# Cumplimiento — Ley N° 29733 (Protección de Datos Personales del Perú)

Este documento describe cómo el Sistema de Gestión de Restaurantes aplica los
**principios rectores** de la Ley N° 29733 y su reglamento (D.S. 003-2013-JUS),
con salvaguardas técnicas razonables para pequeñas y medianas empresas.

> Alcance: el sistema gestiona la **operación del restaurante**, no datos de
> clientes finales. La principal categoría de datos personales tratada es la de
> los **usuarios del personal** (administrador y meseros).

## 1. Principio de finalidad y minimización

- **No se recolectan datos personales de comensales.** Los pedidos se asocian a
  **mesas**, no a personas identificadas.
- La **división de cuentas** usa etiquetas libres no identificatorias
  ("Cliente A", "Cliente B"). El sistema no solicita nombre, DNI, teléfono ni
  correo del comensal.
- De los usuarios del personal solo se almacena lo imprescindible para operar y
  autenticar: **nombre, correo y rol**.

## 2. Seguridad de la información (Art. 9 y Título relativo a medidas de seguridad)

- **Contraseñas cifradas** con `bcrypt` (factor de costo 12). Nunca se almacenan
  ni se devuelven en claro; el campo `passwordHash` jamás se serializa en las
  respuestas.
- **Autenticación segura** mediante JWT de acceso de vida corta (15 min) + token
  de refresco; los secretos se configuran por entorno (`.env`).
- **Control de acceso por roles (RBAC)**: el rol *Operador* solo accede a la
  operación diaria; las funciones sensibles (usuarios, reportes, configuración)
  quedan restringidas al *Administrador*.
- **Validación de entrada** estricta en todos los endpoints (`class-validator`)
  con *whitelist* que descarta campos no declarados, mitigando inyección de datos.
- **Manejo seguro de sesión**: el cliente almacena los tokens y los envía por
  cabecera `Authorization`; ante expiración se renueva o se cierra la sesión.
- **CORS** restringido al origen de la aplicación web.

## 3. Principio de calidad y trazabilidad

- **Bitácora de auditoría** (`AuditLog`) registra acciones sensibles con
  **usuario, acción y fecha/hora**: inicio de sesión, creación/edición de platos,
  creación y modificación de pedidos, registro de pagos, cierres de caja, gestión
  de usuarios, etc.
- La **protección de platos entregados** evita el borrado silencioso de
  información: una corrección conserva el ítem original y crea un reemplazo
  enlazado, manteniendo la integridad del historial.

## 4. Principios de consentimiento y proporcionalidad

- Al no tratar datos de comensales, se elimina la necesidad de recabar
  consentimiento de clientes finales.
- Para el personal, el tratamiento se limita a la **relación laboral/operativa**
  y a la finalidad de autenticación y trazabilidad, de forma proporcional.

## 5. Derechos ARCO (acceso, rectificación, cancelación, oposición)

- El **Administrador** puede consultar, **rectificar** (editar nombre/rol) y
  **cancelar** (desactivar) cuentas de usuario del personal desde el módulo de
  Usuarios, habilitando la atención de solicitudes ARCO.
- La desactivación conserva la trazabilidad histórica sin exponer credenciales.

## 6. Recomendaciones para el despliegue en producción

1. Cambiar **todos** los secretos por defecto (`JWT_ACCESS_SECRET`,
   `JWT_REFRESH_SECRET`) y las contraseñas iniciales sembradas.
2. Servir la aplicación sobre **HTTPS/TLS** (terminación TLS en el proxy o CDN).
3. Realizar **copias de seguridad** periódicas de la base de datos y restringir
   el acceso de red al contenedor de PostgreSQL.
4. Limitar el acceso físico y lógico al servidor; aplicar el principio de mínimo
   privilegio en cuentas del sistema operativo y de base de datos.
5. Mantener actualizadas las dependencias y la imagen base de los contenedores.

> Este documento es una guía técnica de cumplimiento y no constituye asesoría
> legal. Para tratamientos que incluyan datos personales adicionales, evalúe el
> registro de bancos de datos ante la Autoridad Nacional de Protección de Datos
> Personales (ANPD) cuando corresponda.
