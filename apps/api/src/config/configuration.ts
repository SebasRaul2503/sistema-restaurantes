// Configuración tipada cargada desde variables de entorno.

export interface AppConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  isProduction: boolean;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  cookie: {
    /** Segundos de vida de la cookie de refresh. */
    maxAgeSeconds: number;
  };
  seedAdmin: {
    email: string;
    password: string;
    name: string;
  };
}

/** Convierte un string de duración (e.g. "7d", "15m", "3600s") a segundos. */
function parseDurationToSeconds(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)?$/.exec(value.trim());
  if (!match) return 7 * 24 * 60 * 60;
  const n = parseInt(match[1], 10);
  switch (match[2]) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 3600;
    case 'd':
    default:
      return n * 24 * 60 * 60;
  }
}

export default (): AppConfig => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
  return {
    port: parseInt(process.env.API_PORT ?? '3000', 10),
    nodeEnv,
    isProduction: nodeEnv === 'production',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret',
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret',
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      refreshExpiresIn,
    },
    cookie: {
      maxAgeSeconds: parseDurationToSeconds(refreshExpiresIn),
    },
    seedAdmin: {
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@restaurante.pe',
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234',
      name: process.env.SEED_ADMIN_NAME ?? 'Administrador',
    },
  };
};
