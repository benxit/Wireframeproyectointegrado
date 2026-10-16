import api from '../api/client';
import { fallo, mensajeError, ok } from './alertas';

/**
 * Descarga un archivo de la API (informe CSV o evidencia) usando la sesión en cookies.
 * No se usan enlaces directos a /media: la API controla quién puede descargar cada archivo.
 */
export async function descargar(url, params = {}, nombrePorDefecto = 'archivo') {
  try {
    const limpio = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));
    const r = await api.get(url, { params: limpio, responseType: 'blob' });
    const cd = r.headers['content-disposition'] || '';
    const nombre = /filename="?([^";]+)"?/.exec(cd)?.[1] || nombrePorDefecto;
    const href = URL.createObjectURL(r.data);
    const a = Object.assign(document.createElement('a'), { href, download: nombre });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    ok('Descarga lista', nombre);
  } catch (err) {
    // La respuesta de error también llega como blob: se convierte para mostrar el mensaje real.
    if (err.response?.data instanceof Blob) {
      try { err.response.data = JSON.parse(await err.response.data.text()); } catch { /* sin detalle */ }
    }
    fallo(mensajeError(err, 'No se pudo descargar el archivo.'));
  }
}

/** Lista desde la API tolerando respuestas paginadas o simples. */
export const lista = (d) => (Array.isArray(d) ? d : d?.results ?? []);
