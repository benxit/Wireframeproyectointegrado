import axios from 'axios';

/**
 * Cliente de API. La sesion vive en cookies HttpOnly (JavaScript NO puede leer el token: un XSS no lo roba).
 * - withCredentials: el navegador adjunta las cookies solo.
 * - X-CSRF-Token: se copia la cookie "sgr_csrf" a una cabecera (doble envio) en cada peticion que modifica datos.
 */
export const BASE = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: BASE, withCredentials: true });

const leerCookie = (n) => {
  const c = document.cookie.split('; ').find((x) => x.startsWith(`${n}=`));
  return c ? decodeURIComponent(c.split('=')[1]) : '';
};

api.interceptors.request.use((config) => {
  if (!['get', 'head', 'options'].includes((config.method || 'get').toLowerCase())) {
    const t = leerCookie('sgr_csrf');
    if (t) config.headers['X-CSRF-Token'] = t;
  }
  return config;
});

let refrescando = null;
const esAuth = (url = '') => /\/auth\/(login|refresh|logout|estado)/.test(url);

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};
    const st = error.response?.status;

    // Servidor caido / sin conexion -> pantalla "Sistema no disponible"
    if (error.code !== 'ERR_CANCELED' && (!error.response || [502, 503, 504].includes(st))) {
      window.dispatchEvent(new CustomEvent('sgr:caida'));
    }

    // Access token vencido: se rota con el refresh (cookie) UNA vez y se reintenta.
    if (st === 401 && !original._retry && !esAuth(original.url)) {
      original._retry = true;
      try {
        refrescando = refrescando || axios.post(`${BASE}/auth/refresh/`, {}, { withCredentials: true });
        await refrescando;
        refrescando = null;
        return api(original);
      } catch (e) {
        refrescando = null;
        window.dispatchEvent(new CustomEvent('sgr:sesion-expirada'));
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
