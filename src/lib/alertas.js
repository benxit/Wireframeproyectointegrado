import Swal from 'sweetalert2';

/** Todas las alertas del sistema pasan por aquí para mantener el mismo estilo (ver bloque "SweetAlert" en index.css). */
const base = Swal.mixin({
  confirmButtonColor: '#b30d1e',
  cancelButtonColor: '#eceef2',
  reverseButtons: true,
  customClass: { popup: 'swal-sgr', title: 'swal-titulo' },
  showClass: { popup: 'swal-in' },
  hideClass: { popup: 'swal-out' },
});

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3400,
  timerProgressBar: true,
  customClass: { popup: 'swal-toast' },
  showClass: { popup: 'swal-toast-in' },
  didOpen: (t) => { t.onmouseenter = Swal.stopTimer; t.onmouseleave = Swal.resumeTimer; },
});

export const ok = (titulo, texto) => toast.fire({ icon: 'success', title: titulo, text: texto });
export const aviso = (icon, titulo, texto) => toast.fire({ icon, title: titulo, text: texto });
export const fallo = (texto, titulo = 'No se pudo completar') => base.fire({ icon: 'error', title: titulo, text: texto, confirmButtonText: 'Entendido' });
export const info = (titulo, texto) => base.fire({ icon: 'info', title: titulo, text: texto, confirmButtonText: 'Entendido' });

export async function confirmar({ titulo, texto, confirmar: si = 'Sí, continuar', icono = 'question', peligro = false }) {
  const r = await base.fire({
    icon: icono, title: titulo, text: texto, showCancelButton: true, focusCancel: true,
    confirmButtonText: si, cancelButtonText: 'Cancelar', confirmButtonColor: peligro ? '#b30d1e' : '#1d1d27',
  });
  return r.isConfirmed;
}

/** Pide un texto (p. ej. el motivo de un rechazo). Devuelve el texto, o null si se cancela. */
export async function pedirTexto({ titulo, texto, placeholder = '', confirmar: si = 'Aceptar', obligatorio = true }) {
  const r = await base.fire({
    icon: 'question', title: titulo, text: texto, input: 'textarea', inputPlaceholder: placeholder,
    showCancelButton: true, confirmButtonText: si, cancelButtonText: 'Cancelar',
    inputValidator: (v) => (obligatorio && !v.trim() ? 'Este campo es obligatorio.' : undefined),
  });
  return r.isConfirmed ? r.value : null;
}

/** Saca un mensaje legible de una respuesta de error de la API (Django REST). */
export function mensajeError(err, porDefecto = 'Ocurrió un error inesperado.') {
  const d = err?.response?.data;
  if (!d) return porDefecto;
  if (typeof d === 'string') return porDefecto;
  if (d.detail) return String(d.detail);
  const campo = Object.keys(d)[0];
  const v = d[campo];
  return `${campo}: ${Array.isArray(v) ? v[0] : v}`;
}

/** Lluvia de confeti rojo/blanco/negro (canvas propio, sin dependencias). */
export function confeti({ x = 0.5, y = 0.35, cantidad = 130 } = {}) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  Object.assign(c.style, { position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 99999 });
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  const colores = ['#b30d1e', '#e11d31', '#ffffff', '#1d1d27', '#f5b301', '#ff7a8a'];
  const ps = Array.from({ length: cantidad }, () => ({
    x: c.width * x, y: c.height * y, vx: (Math.random() - 0.5) * 15, vy: Math.random() * -15 - 4, g: 0.35 + Math.random() * 0.2,
    s: 6 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, col: colores[(Math.random() * colores.length) | 0],
  }));
  let f = 0;
  (function paso() {
    ctx.clearRect(0, 0, c.width, c.height);
    f += 1;
    ps.forEach((p) => {
      p.vy += p.g; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.col; ctx.globalAlpha = Math.max(0, 1 - f / 130);
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    });
    if (f < 140) requestAnimationFrame(paso); else c.remove();
  }());
}

/** Instancia base de SweetAlert con el tema SGR (para dialogos personalizados). */
export { base as dialogo };
