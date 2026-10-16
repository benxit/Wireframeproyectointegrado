import { dialogo } from './alertas';
import api from '../api/client';

/** Pide contraseña (y codigo TOTP si la cuenta tiene MFA) y abre 5 min de "modo sudo" en el servidor. */
export async function pedirReauth(conMfa = false) {
  const r = await dialogo.fire({
    icon: 'info', title: 'Confirma tu identidad',
    html: `<p style="margin:0 0 .8rem">Por seguridad, vuelve a ingresar tu contraseña${conMfa ? ' y el código de tu app autenticadora' : ''}.</p>
      <input id="ra-pass" type="password" class="swal2-input" placeholder="Contraseña" autocomplete="current-password" style="margin:.3rem 0">
      ${conMfa ? '<input id="ra-cod" inputmode="numeric" maxlength="12" class="swal2-input" placeholder="Código de 6 dígitos" autocomplete="one-time-code" style="margin:.3rem 0">' : ''}`,
    focusConfirm: false, showCancelButton: true, confirmButtonText: 'Confirmar', cancelButtonText: 'Cancelar', showLoaderOnConfirm: true,
    preConfirm: async () => {
      const password = document.getElementById('ra-pass').value;
      const codigo = conMfa ? document.getElementById('ra-cod').value : undefined;
      if (!password || (conMfa && !codigo)) { dialogo.showValidationMessage('Completa los campos.'); return false; }
      try { await api.post('/cuenta/reautenticar/', { password, codigo }); return true; }
      catch (e) { dialogo.showValidationMessage(e.response?.data?.detail || 'No se pudo verificar.'); return false; }
    },
  });
  return r.isConfirmed;
}

/** Ejecuta fn(); si el servidor pide re-autenticacion, la solicita y reintenta una vez. Lanza {cancelado:true} si el usuario cancela. */
export async function conReauth(fn, conMfa = false) {
  try { return await fn(); } catch (err) {
    if (err.response?.status === 403 && err.response.data?.codigo === 'reauth_requerida') {
      if (!(await pedirReauth(conMfa))) throw { cancelado: true };
      return fn();
    }
    throw err;
  }
}

/** Mide la fortaleza de una contraseña (0-4) y qué requisitos cumple. */
export function fortaleza(p = '') {
  const req = [
    { ok: p.length >= 10, t: '10 caracteres o más' },
    { ok: /[A-Z]/.test(p), t: 'Una mayúscula' },
    { ok: /[a-z]/.test(p), t: 'Una minúscula' },
    { ok: /\d/.test(p), t: 'Un número' },
    { ok: /[^A-Za-z0-9]/.test(p), t: 'Un símbolo' },
  ];
  const tipos = req.slice(1).filter((r) => r.ok).length;
  const nivel = !p ? 0 : p.length < 10 ? 1 : tipos >= 4 ? 4 : tipos >= 3 ? 3 : 2;
  return { req, nivel, etiqueta: ['', 'Débil', 'Regular', 'Buena', 'Excelente'][nivel] };
}
