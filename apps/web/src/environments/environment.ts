// La app llama a la API mediante una ruta relativa `/api`. En desarrollo,
// `proxy.conf.json` la reenvía a http://localhost:3000; en producción, nginx
// la reenvía al contenedor `api`. Así se evita CORS y URLs codificadas.
export const environment = {
  production: false,
  apiBaseUrl: '/api',
};
