import api from '../api/client';
import { dialogo, fallo, mensajeError, ok } from './alertas';

/** Escapa texto antes de insertarlo en el HTML del diálogo (los comentarios los escriben usuarios: anti-XSS). */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fecha = (s) => new Date(s.replace(' ', 'T')).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Conversación asociada a un registro (RF-035, HU-24): muestra los comentarios en orden cronológico
 * con autor y fecha, y permite agregar uno nuevo. `puedeEscribir` = false para el rol Consulta.
 */
export async function abrirComentarios({ entidad, objetoId, titulo, puedeEscribir = true }) {
  let lista = [];
  try {
    ({ data: lista } = await api.get('/comentarios/', { params: { entidad, objeto: objetoId } }));
  } catch (err) {
    fallo(mensajeError(err, 'No se pudieron cargar los comentarios.'));
    return;
  }
  const items = lista.length
    ? lista.map((c) => `<li style="text-align:left;margin:.45rem 0;padding:.55rem .7rem;border-radius:.6rem;background:var(--color-stone-50,#f7f5f4)">
        <b style="font-size:.82rem">${esc(c.autor_nombre || 'Usuario')}</b>
        <span style="font-size:.72rem;opacity:.65"> · ${esc(fecha(c.fecha))}</span>
        <div style="font-size:.88rem;margin-top:.15rem;white-space:pre-wrap">${esc(c.texto)}</div></li>`).join('')
    : '<p style="font-size:.88rem;opacity:.7">Aún no hay comentarios en este registro.</p>';

  const r = await dialogo.fire({
    title: esc(titulo || 'Comentarios'),
    html: `<ul style="list-style:none;padding:0;margin:0 0 .6rem;max-height:16rem;overflow:auto">${items}</ul>`,
    input: puedeEscribir ? 'textarea' : undefined,
    inputPlaceholder: 'Escribe una observación o consulta…',
    inputAttributes: { maxlength: '1000', 'aria-label': 'Nuevo comentario' },
    showCancelButton: puedeEscribir,
    confirmButtonText: puedeEscribir ? 'Comentar' : 'Cerrar',
    cancelButtonText: 'Cerrar',
    inputValidator: (v) => (puedeEscribir && !v.trim() ? 'Escribe un comentario.' : undefined),
  });
  if (!puedeEscribir || !r.isConfirmed) return;
  try {
    await api.post('/comentarios/', { entidad, objeto_id: objetoId, texto: r.value });
    ok('Comentario agregado');
  } catch (err) {
    fallo(mensajeError(err, 'No se pudo guardar el comentario.'));
  }
}
