import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Briefcase, Camera, Check, Copy, Eye, EyeOff, Fingerprint, History, KeyRound, Lock, LogOut, Mail, Pencil,
  Phone, Settings, ShieldCheck, Smartphone, SlidersHorizontal, User, X,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/ThemeContext';
import { confirmar, dialogo, fallo, mensajeError, ok, pedirTexto } from '../lib/alertas';
import { conReauth, fortaleza } from '../lib/seguridad';
import FaroMini from '../components/Faro';
import TemaSwitch from '../components/TemaSwitch';

const fecha = (s) => (s ? new Date(s.replace(' ', 'T')).toLocaleString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const TABS = [{ id: 'datos', t: 'Datos personales', i: User }, { id: 'seguridad', t: 'Seguridad', i: Lock }, { id: 'prefs', t: 'Preferencias', i: SlidersHorizontal }];
const EVENTO = {
  login: ['Inicio de sesión', true], login_fallido: ['Intento de ingreso fallido', false], logout: ['Cierre de sesión', true], password_cambio: ['Contraseña cambiada', true],
  password_cambio_fallido: ['Cambio de contraseña fallido', false], password_reset: ['Contraseña restablecida', true], mfa_activado: ['Verificación en dos pasos activada', true],
  mfa_desactivado: ['Verificación en dos pasos desactivada', true], mfa_fallido: ['Código de verificación incorrecto', false], reauth: ['Identidad confirmada', true],
  reauth_fallida: ['Confirmación de identidad fallida', false], pii_lectura: ['Viste un dato personal', true], pii_modificacion: ['Modificaste datos personales', true],
  sesiones_cerradas: ['Cerraste otras sesiones', true], bloqueo_cuenta: ['Cuenta bloqueada temporalmente', false], avatar: ['Foto de perfil', true],
};

function Campo({ icono: Ico, etiqueta, children }) {
  return (
    <label className="cf-campo"><span className="cf-et"><Ico size={15} /> {etiqueta}</span>{children}</label>
  );
}

/** Dato sensible: llega enmascarado. "Ver" lo revela 30 s (exige re-autenticacion y queda en auditoria). "Cambiar" lo edita. */
function CampoSensible({ icono, etiqueta, campo, enmascarado, onCambiar, mfa }) {
  const [valor, setValor] = useState(null);
  const [seg, setSeg] = useState(0);
  useEffect(() => {
    if (seg <= 0) { if (valor !== null) setValor(null); return undefined; }
    const t = setTimeout(() => setSeg((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seg, valor]);

  async function revelar() {
    if (valor !== null) { setValor(null); setSeg(0); return; }
    try {
      const { data } = await conReauth(() => api.post('/cuenta/revelar/', { campo }), mfa);
      setValor(data.valor || '—'); setSeg(data.ttl || 30);
    } catch (e) { if (!e.cancelado) fallo(mensajeError(e)); }
  }
  return (
    <Campo icono={icono} etiqueta={etiqueta}>
      <span className={`cf-input sens ${valor !== null ? 'visible' : ''}`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={valor ?? 'm'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
            {valor ?? (enmascarado || 'No registrado')}
          </motion.span>
        </AnimatePresence>
        {valor !== null && <em className="cf-ttl">{seg}s</em>}
        <button type="button" onClick={revelar} aria-label={valor !== null ? 'Ocultar' : 'Mostrar dato'} title={valor !== null ? 'Ocultar' : 'Mostrar (pide confirmar identidad)'}>
          {valor !== null ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        {onCambiar && <button type="button" onClick={onCambiar} aria-label="Cambiar" title="Cambiar"><Pencil size={15} /></button>}
      </span>
    </Campo>
  );
}

function PanelDatos({ perfil, recargar, mfa }) {
  const [f, setF] = useState({ first_name: perfil.first_name || '', last_name: perfil.last_name || '' });
  const [guardando, setGuardando] = useState(false);
  const sucio = f.first_name !== (perfil.first_name || '') || f.last_name !== (perfil.last_name || '');

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    try { await api.patch('/cuenta/perfil/', f); await recargar(); ok('Cambios guardados', 'Tu perfil se actualizó.'); }
    catch (err) { fallo(mensajeError(err, 'No se pudo guardar.')); } finally { setGuardando(false); }
  }
  async function cambiar(campo, titulo, ph) {
    const nuevo = await pedirTexto({ titulo, texto: 'Se validará el formato antes de guardar.', placeholder: ph, confirmar: 'Continuar' });
    if (!nuevo) return;
    try { await conReauth(() => api.patch('/cuenta/perfil/', { [campo]: nuevo }), mfa); await recargar(); ok('Dato actualizado'); }
    catch (err) { if (!err.cancelado) fallo(Object.values(err.response?.data || {}).flat()[0] || 'No se pudo actualizar.'); }
  }
  return (
    <form onSubmit={guardar} className="cf-grid">
      <Campo icono={User} etiqueta="Nombre"><input className="cf-input" value={f.first_name} maxLength={60} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></Campo>
      <Campo icono={User} etiqueta="Apellido"><input className="cf-input" value={f.last_name} maxLength={60} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></Campo>
      <CampoSensible icono={Mail} etiqueta="Correo electrónico" campo="email" enmascarado={perfil.email_masked} mfa={mfa} onCambiar={() => cambiar('email', 'Nuevo correo electrónico', 'nombre@laserena.cl')} />
      <CampoSensible icono={Fingerprint} etiqueta="RUT" campo="rut" enmascarado={perfil.rut_masked} mfa={mfa} />
      <CampoSensible icono={Phone} etiqueta="Número de teléfono" campo="telefono" enmascarado={perfil.telefono_masked} mfa={mfa} onCambiar={() => cambiar('telefono', 'Nuevo teléfono', '+56 9 1234 5678')} />
      <Campo icono={Briefcase} etiqueta="Cargo"><span className="cf-input ro">{perfil.cargo_nombre || 'Sin cargo asignado'}</span></Campo>
      <p className="cf-nota"><ShieldCheck size={14} /> Tu RUT, correo y teléfono se guardan cifrados (AES-256) y se muestran enmascarados. Verlos o cambiarlos exige confirmar tu identidad y queda registrado.</p>
      <div className="cf-acciones">
        <button type="submit" className="cf-btn pri" disabled={!sucio || guardando}><Check size={16} /> {guardando ? 'Guardando…' : 'Guardar cambios'}</button>
      </div>
    </form>
  );
}

function Medidor({ pass }) {
  const { req, nivel, etiqueta } = fortaleza(pass);
  return (
    <div className="medidor">
      <div className="med-barras">{[1, 2, 3, 4].map((n) => <i key={n} className={nivel >= n ? `n${nivel}` : ''} />)}<b className={`n${nivel}`}>{etiqueta}</b></div>
      <ul>{req.map((r) => <li key={r.t} className={r.ok ? 'ok' : ''}>{r.ok ? <Check size={12} /> : <X size={12} />} {r.t}</li>)}</ul>
    </div>
  );
}

function ClavePanel() {
  const [f, setF] = useState({ actual: '', nueva: '', conf: '' });
  const [ver, setVer] = useState(false);
  const [err, setErr] = useState({});
  const [cargando, setCargando] = useState(false);
  const coincide = f.nueva && f.nueva === f.conf;
  async function enviar(e) {
    e.preventDefault(); setErr({});
    if (!coincide) { setErr({ conf: ['Las contraseñas no coinciden.'] }); return; }
    setCargando(true);
    try { await api.post('/auth/password/cambiar/', { actual: f.actual, nueva: f.nueva }); setF({ actual: '', nueva: '', conf: '' }); ok('Contraseña actualizada', 'Se cerraron tus otras sesiones.'); }
    catch (x) { setErr(x.response?.data || { actual: [mensajeError(x)] }); } finally { setCargando(false); }
  }
  const E = ({ k }) => (err[k] ? <span className="cf-err">{[].concat(err[k])[0]}</span> : null);
  return (
    <form onSubmit={enviar} className="cf-bloque">
      <h3><KeyRound size={17} /> Cambiar contraseña</h3>
      <div className="cf-grid">
        <label className="cf-campo"><span className="cf-et">Contraseña actual</span>
          <span className="cf-input"><input type={ver ? 'text' : 'password'} value={f.actual} onChange={(e) => setF({ ...f, actual: e.target.value })} autoComplete="current-password" required /></span><E k="actual" /></label>
        <span />
        <label className="cf-campo"><span className="cf-et">Nueva contraseña</span>
          <span className="cf-input"><input type={ver ? 'text' : 'password'} value={f.nueva} onChange={(e) => setF({ ...f, nueva: e.target.value })} autoComplete="new-password" required />
            <button type="button" onClick={() => setVer(!ver)} aria-label="Mostrar u ocultar">{ver ? <EyeOff size={16} /> : <Eye size={16} />}</button></span><E k="nueva" /></label>
        <label className="cf-campo"><span className="cf-et">Repetir nueva contraseña</span>
          <span className="cf-input"><input type={ver ? 'text' : 'password'} value={f.conf} onChange={(e) => setF({ ...f, conf: e.target.value })} autoComplete="new-password" required /></span><E k="conf" /></label>
      </div>
      <Medidor pass={f.nueva} />
      <div className="cf-acciones"><button className="cf-btn pri" disabled={cargando || !f.actual || !coincide}><Lock size={16} /> {cargando ? 'Actualizando…' : 'Actualizar contraseña'}</button></div>
    </form>
  );
}

function MfaPanel({ perfil, recargar }) {
  const [conf, setConf] = useState(null);   // { secreto, uri }
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);

  async function iniciar() {
    try { const { data } = await conReauth(() => api.post('/cuenta/mfa/iniciar/'), false); setConf(data); setCodigo(''); }
    catch (e) { if (!e.cancelado) fallo(mensajeError(e)); }
  }
  async function activar(e) {
    e.preventDefault(); setCargando(true);
    try {
      const { data } = await api.post('/cuenta/mfa/activar/', { codigo });
      setConf(null); await recargar();
      await dialogo.fire({
        icon: 'success', title: 'Verificación en dos pasos activa',
        html: `<p style="margin:0 0 .6rem">Guarda estos códigos de recuperación en un lugar seguro. <b>No volverán a mostrarse</b> y cada uno sirve una sola vez.</p>
          <div class="rec-codigos">${data.codigos.map((c) => `<code>${c}</code>`).join('')}</div>`,
        confirmButtonText: 'Ya los guardé', showDenyButton: true, denyButtonText: 'Copiar', denyButtonColor: '#1d1d27',
        preDeny: () => { navigator.clipboard?.writeText(data.codigos.join('\n')); return false; },
      });
    } catch (x) { fallo(mensajeError(x, 'Código incorrecto.')); } finally { setCargando(false); }
  }
  async function desactivar() {
    if (!(await confirmar({ titulo: '¿Desactivar la verificación en dos pasos?', texto: 'Tu cuenta quedará protegida solo por la contraseña.', confirmar: 'Sí, desactivar', icono: 'warning', peligro: true }))) return;
    try { await conReauth(() => api.post('/cuenta/mfa/desactivar/'), true); await recargar(); ok('Verificación en dos pasos desactivada'); }
    catch (e) { if (!e.cancelado) fallo(mensajeError(e)); }
  }
  return (
    <div className="cf-bloque">
      <h3><Smartphone size={17} /> Verificación en dos pasos (TOTP)</h3>
      <p className="cf-sub">Pide un código de 6 dígitos de tu app (Google Authenticator, Microsoft Authenticator, Authy…) además de la contraseña. Protege tu cuenta si alguien descubre tu clave.</p>
      <div className={`mfa-estado ${perfil.mfa_activo ? 'on' : ''}`}>
        <ShieldCheck size={18} /><b>{perfil.mfa_activo ? 'Activada' : 'Desactivada'}</b>
        {perfil.mfa_activo && <small>{perfil.codigos_restantes} códigos de recuperación disponibles</small>}
        <span style={{ flex: 1 }} />
        {perfil.mfa_activo ? <button type="button" className="cf-btn peligro" onClick={desactivar}>Desactivar</button>
          : !conf && <button type="button" className="cf-btn pri" onClick={iniciar}>Activar</button>}
      </div>
      <AnimatePresence>
        {conf && (
          <motion.form onSubmit={activar} className="mfa-setup" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="mfa-qr"><QRCodeSVG value={conf.uri} size={150} marginSize={2} /></div>
            <div className="mfa-pasos">
              <ol><li>Escanea el código QR con tu app autenticadora.</li><li>O ingresa esta clave manualmente: <code>{conf.secreto}</code>
                <button type="button" className="mini-ic" onClick={() => { navigator.clipboard?.writeText(conf.secreto); ok('Clave copiada'); }}><Copy size={13} /></button></li>
                <li>Escribe el código de 6 dígitos que muestra la app.</li></ol>
              <div className="mfa-cod"><input inputMode="numeric" maxLength={6} placeholder="000000" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} autoFocus />
                <button className="cf-btn pri" disabled={codigo.length !== 6 || cargando}>{cargando ? 'Verificando…' : 'Confirmar'}</button>
                <button type="button" className="cf-btn" onClick={() => setConf(null)}>Cancelar</button></div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function Actividad({ refresco }) {
  const [filas, setFilas] = useState(null);
  useEffect(() => { api.get('/cuenta/actividad/').then((r) => setFilas(r.data)).catch(() => setFilas([])); }, [refresco]);
  return (
    <div className="cf-bloque">
      <h3><History size={17} /> Actividad reciente de seguridad</h3>
      {filas === null && <p className="cf-sub">Cargando…</p>}
      {filas?.length === 0 && <p className="cf-sub">Sin actividad registrada todavía.</p>}
      <ul className="act-lista">
        {(filas || []).map((a, i) => {
          const [t, bueno] = EVENTO[a.evento] || [a.evento, a.exito];
          return (
            <motion.li key={a.id} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className={bueno && a.exito ? '' : 'mal'}>
              <i />
              <div><b>{t}</b><small>{fecha(a.fecha)}{a.ip ? ` · IP ${a.ip}` : ''}{a.detalle ? ` · ${a.detalle.replace('campos=', 'campos: ').replace('campo=', 'campo: ')}` : ''}</small></div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

function PanelSeguridad({ perfil, recargar, mfa }) {
  const [tick, setTick] = useState(0);
  async function cerrarOtras() {
    if (!(await confirmar({ titulo: '¿Cerrar la sesión en otros dispositivos?', texto: 'Esta sesión seguirá abierta; el resto deberá volver a ingresar.', confirmar: 'Sí, cerrar' }))) return;
    try { await conReauth(() => api.post('/cuenta/cerrar-sesiones/'), mfa); setTick((t) => t + 1); ok('Otras sesiones cerradas'); }
    catch (e) { if (!e.cancelado) fallo(mensajeError(e)); }
  }
  return (
    <div className="cf-pila">
      <ClavePanel />
      <MfaPanel perfil={perfil} recargar={async () => { await recargar(); setTick((t) => t + 1); }} />
      <div className="cf-bloque">
        <h3><LogOut size={17} /> Sesiones</h3>
        <p className="cf-sub">Contraseña actualizada: <b>{fecha(perfil.password_actualizada)}</b>. Si ves actividad que no reconoces, cierra las demás sesiones y cambia tu contraseña.</p>
        <button type="button" className="cf-btn" onClick={cerrarOtras}>Cerrar sesión en otros dispositivos</button>
      </div>
      <Actividad refresco={tick} />
    </div>
  );
}

function Interruptor({ activo, onChange, etiqueta, desc }) {
  return (
    <div className="pref-fila">
      <div><b>{etiqueta}</b><small>{desc}</small></div>
      <button type="button" role="switch" aria-checked={activo} className={`sw ${activo ? 'on' : ''}`} onClick={() => onChange(!activo)}><motion.i layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} /></button>
    </div>
  );
}

function PanelPrefs() {
  const { compacto, setCompacto, calmo, setCalmo } = useTema();
  return (
    <div className="cf-pila">
      <div className="cf-bloque">
        <h3><SlidersHorizontal size={17} /> Apariencia</h3>
        <div className="pref-fila"><div><b>Tema</b><small>Modo día o noche. Se recuerda en este navegador.</small></div><TemaSwitch grande /></div>
        <Interruptor activo={compacto} onChange={setCompacto} etiqueta="Menú lateral compacto" desc="Muestra solo los íconos; también puedes alternarlo desde el botón del menú." />
        <Interruptor activo={calmo} onChange={setCalmo} etiqueta="Reducir animaciones" desc="Desactiva movimientos y efectos decorativos." />
      </div>
    </div>
  );
}

export default function Configuracion() {
  const { usuario, recargar } = useAuth();
  const [tab, setTab] = useState('datos');
  const [subiendo, setSubiendo] = useState(false);
  const archivo = useRef(null);
  const mfa = !!usuario?.mfa_activo;

  async function subir(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { fallo('La imagen supera los 2 MB.'); return; }
    const fd = new FormData(); fd.append('avatar', f);
    setSubiendo(true);
    try { await api.post('/cuenta/avatar/', fd); await recargar(); ok('Foto actualizada'); }
    catch (err) { fallo(mensajeError(err, 'No se pudo subir la imagen.')); } finally { setSubiendo(false); }
  }
  async function quitar() {
    if (!(await confirmar({ titulo: '¿Quitar tu foto de perfil?', confirmar: 'Sí, quitar', icono: 'warning', peligro: true }))) return;
    try { await api.delete('/cuenta/avatar/'); await recargar(); ok('Foto eliminada'); } catch (err) { fallo(mensajeError(err)); }
  }
  if (!usuario) return null;
  const inicial = (usuario.nombre_completo || '?')[0].toUpperCase();

  return (
    <div className="cfg">
      <motion.header className="cfg-cab" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}>
        <div className="cfg-titulo">
          <motion.span className="cfg-eng" animate={{ rotate: 360 }} transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}><Settings size={28} /></motion.span>
          <div><h1>Configuración de cuenta</h1><p>Administra tu información personal y de acceso al sistema.</p></div>
        </div>
        <div className="cfg-sello"><b>La Serena</b><span>siempre cerca</span></div>
      </motion.header>

      <div className="cfg-cuerpo">
        <motion.aside className="cfg-perfil glass" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <div className="avatar-zona">
            <div className="avatar-xl">
              {usuario.avatar ? <img src={usuario.avatar} alt={`Foto de ${usuario.nombre_completo}`} /> : <span>{inicial}</span>}
              {subiendo && <div className="av-cargando" />}
              <button type="button" className="av-edit" onClick={() => archivo.current?.click()} aria-label="Cambiar foto"><Camera size={15} /></button>
              <input ref={archivo} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={subir} />
            </div>
            {/* Tarjeta con la ficha del funcionario al pasar el mouse (o enfocar con teclado) */}
            <div className="ficha" role="tooltip">
              <h4>{usuario.nombre_completo}</h4>
              <dl>
                <dt>Cargo</dt><dd>{usuario.cargo_nombre || 'Sin cargo'}</dd>
                <dt>Delegación</dt><dd>{usuario.delegacion_nombre || 'Sin delegación'}</dd>
                <dt>Roles</dt><dd>{usuario.roles?.join(', ') || '—'}</dd>
                <dt>Usuario</dt><dd>@{usuario.username}</dd>
                <dt>Último acceso</dt><dd>{fecha(usuario.last_login)}</dd>
                <dt>En el sistema desde</dt><dd>{fecha(usuario.date_joined)}</dd>
                <dt>Verificación 2 pasos</dt><dd className={mfa ? 'si' : 'no'}>{mfa ? 'Activada' : 'Desactivada'}</dd>
              </dl>
            </div>
          </div>
          <h2>{usuario.nombre_completo}</h2>
          <p className="rol">{usuario.roles?.[0] || 'Usuario'}</p>
          <span className="en-linea"><i /> En línea</span>
          {usuario.avatar && <button type="button" className="quitar-foto" onClick={quitar}>Quitar foto</button>}
          <blockquote>“Juntos construimos una mejor ciudad”</blockquote>
          <div className="perfil-faro"><FaroMini tam={70} /></div>
        </motion.aside>

        <motion.section className="cfg-panel glass" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <div className="cfg-tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
                <t.i size={16} /> {t.t}
                {tab === t.id && <motion.span layoutId="tab-linea" className="tab-linea" />}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={tab} className="cfg-contenido" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {tab === 'datos' && <PanelDatos perfil={usuario} recargar={recargar} mfa={mfa} />}
              {tab === 'seguridad' && <PanelSeguridad perfil={usuario} recargar={recargar} mfa={mfa} />}
              {tab === 'prefs' && <PanelPrefs />}
            </motion.div>
          </AnimatePresence>
        </motion.section>
      </div>
    </div>
  );
}
