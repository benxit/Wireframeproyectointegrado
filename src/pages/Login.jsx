import { useState, useRef } from 'react';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Marca } from '../components/Escudo';
import { ok, aviso, info, confeti, dialogo } from '../lib/alertas';

const USUARIOS_DEMO = [
  'admin_demo', 'coordinador_demo', 'delegado_demo',
  'funcionario_demo', 'verificador_demo', 'consulta_demo',
];

const CLAVE_RECUERDO = 'sgr_usuario';

function leerRecuerdo() {
  try { return localStorage.getItem(CLAVE_RECUERDO) || ''; } catch { return ''; }
}

const Icono = {
  usuario: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>,
  candado: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V8a3 3 0 0 0-6 0zm3 4a1.6 1.6 0 0 0-.8 3v1.6h1.6V17A1.6 1.6 0 0 0 12 14z" /></svg>,
  ojo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" /><circle cx="12" cy="12" r="3" /></svg>,
  ojoCerrado: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" /><circle cx="12" cy="12" r="3" /><path d="M3 3l18 18" /></svg>,
  flecha: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16M14 6l6 6-6 6" /></svg>,
};

const ACCESOS = [
  { t: ['Actividades', 'y evidencias'], i: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6h18l8 8v28H12z" /><path d="M30 6v8h8M18 22h8M18 29h6" /><circle cx="33" cy="35" r="7" fill="#8f0a1a" /><path d="M30 35l2.3 2.3L36.5 33" /></svg> },
  { t: ['Metas', 'y periodos'], i: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="24" cy="26" r="16" /><circle cx="24" cy="26" r="9" /><circle cx="24" cy="26" r="2.5" fill="currentColor" /><path d="M24 26L38 8M34 8h5v5" /></svg> },
  { t: ['Agenda', 'colectiva'], i: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="10" width="34" height="32" rx="4" /><path d="M7 20h34M15 5v9M33 5v9M15 28h2M23 28h2M31 28h2M15 35h2M23 35h2M31 35h2" /></svg> },
  { t: ['Tableros', 'y semáforo'], i: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 40h36" /><rect x="10" y="24" width="7" height="16" /><rect x="21" y="14" width="7" height="26" /><rect x="32" y="6" width="7" height="34" /></svg> },
];

export default function Login() {
  const recordado = leerRecuerdo();
  const [username, setUsername] = useState(recordado);
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [recordar, setRecordar] = useState(Boolean(recordado));
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { login, loginMfa } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [cod, setCod] = useState(['', '', '', '', '', '']);
  const refs = useRef([]);
  const navigate = useNavigate();

  function terminar() {
    try {
      if (recordar) localStorage.setItem(CLAVE_RECUERDO, username);
      else localStorage.removeItem(CLAVE_RECUERDO);
    } catch { /* sin almacenamiento disponible */ }
    ok('¡Bienvenido/a!', 'Ingreso exitoso.');
    confeti({ y: 0.4 });
    navigate('/');
  }

  function msgError(err, def) {
    const d = err?.response?.data;
    return (typeof d?.detail === 'string' && d.detail) || def;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const r = await login(username, password);
      if (r?.mfa) { setTicket(r.ticket); setTimeout(() => refs.current[0]?.focus(), 80); }
      else terminar();
    } catch (err) {
      const m = msgError(err, 'Usuario o contraseña incorrectos.');
      setError(m);
      aviso('error', 'No se pudo ingresar', m);
    } finally {
      setCargando(false);
    }
  }

  async function enviarCodigo(valor) {
    setError(''); setCargando(true);
    try { await loginMfa(ticket, valor); terminar(); }
    catch (err) {
      setError(msgError(err, 'Código incorrecto.'));
      setCod(['', '', '', '', '', '']); refs.current[0]?.focus();
    } finally { setCargando(false); }
  }

  function cambiarDigito(i, v) {
    const limpio = v.replace(/\D/g, '');
    if (limpio.length > 1) { // pegado
      const arr = limpio.slice(0, 6).split(''); while (arr.length < 6) arr.push('');
      setCod(arr); if (limpio.length >= 6) enviarCodigo(limpio.slice(0, 6)); else refs.current[limpio.length]?.focus();
      return;
    }
    const arr = [...cod]; arr[i] = limpio; setCod(arr);
    if (limpio && i < 5) refs.current[i + 1]?.focus();
    if (arr.every(Boolean)) enviarCodigo(arr.join(''));
  }

  async function olvide() {
    const r = await dialogo.fire({
      title: 'Recuperar contraseña', text: 'Ingresa tu usuario o correo. Si existe, te enviaremos un enlace (válido 30 min).',
      input: 'text', inputPlaceholder: 'Usuario o correo', showCancelButton: true, confirmButtonText: 'Enviar enlace', cancelButtonText: 'Cancelar',
      inputValidator: (v) => (!v?.trim() ? 'Escribe tu usuario o correo' : undefined),
    });
    if (!r.isConfirmed) return;
    try { await api.post('/auth/password/olvide/', { identificador: r.value.trim() }); } catch { /* respuesta genérica siempre */ }
    info('Revisa tu correo', 'Si la cuenta existe, recibirás un enlace para restablecer tu contraseña.');
  }

  return (
    <div className="lg-page">
      <header className="lg-header">
        <Marca />
        <div className="lg-lema">
          <svg viewBox="0 0 64 56" fill="none" stroke="#b30d1e" strokeWidth="2.4" strokeLinejoin="round" aria-hidden="true">
            <path d="M32 3v7M29 6h6M18 22l14-12 14 12M6 52V30h12v22M46 30h12v22M18 52V22h28v30zM6 52h52" />
            <path d="M25 32h4v6h-4zM35 32h4v6h-4zM25 43h4v9h-4zM35 43h4v9h-4z" />
          </svg>
          <i />
          <span>Juntos construimos<br />una mejor ciudad</span>
        </div>
      </header>

      <main className="lg-hero">
        <section className="lg-foto">
          <div className="particulas">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ left: `${(i * 6.3 + 4) % 96}%`, animationDelay: `${i * 0.8}s`, animationDuration: `${9 + (i % 5) * 2}s` }} />)}</div>
          <div className="lg-titulo">
            <small>MUNICIPALIDAD DE</small>
            <h1>La Serena</h1>
            <p>Metas, actividades y resultados de tu equipo, en un solo lugar.</p>
          </div>
          <div className="lg-accesos">
            {ACCESOS.map((a, i) => (
              <div key={a.t[0]} style={{ '--i': i }}>
                {a.i}
                {a.t[0]}<br />{a.t[1]}
              </div>
            ))}
          </div>
        </section>

        <section className="lg-lado-der">
          <span className="orb o1" /><span className="orb o2" /><span className="orb o3" />
          <div className="lg-card">
            <Marca />
            <h2>Iniciar sesión</h2>
            <p>Accede a tu cuenta para registrar actividades, consultar tu avance y más.</p>

            {ticket ? (
              <div className="lg-mfa">
                <h2 style={{ margin: 0 }}>Verificación en dos pasos</h2>
                <p>Ingresa el código de 6 dígitos de tu app de autenticación (o un código de recuperación).</p>
                {error && <div className="error" key={error}>{error}</div>}
                <div className="lg-codigo">
                  {cod.map((d, i) => (
                    <input key={i} ref={(el) => (refs.current[i] = el)} value={d} inputMode="numeric" autoComplete="one-time-code" maxLength={6} disabled={cargando}
                      onChange={(e) => cambiarDigito(i, e.target.value)} onKeyDown={(e) => { if (e.key === 'Backspace' && !cod[i] && i > 0) refs.current[i - 1]?.focus(); }} aria-label={`Dígito ${i + 1}`} />
                  ))}
                </div>
                <button type="button" className="lg-volver" onClick={() => { setTicket(null); setError(''); setCod(['', '', '', '', '', '']); }}>← Volver</button>
              </div>
            ) : (
            <form className="lg-form" onSubmit={onSubmit}>
              {error && <div className="error" key={error + Date.now()}>{error}</div>}

              <label className="lg-campo">
                {Icono.usuario}
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="RUT o Usuario"
                  aria-label="RUT o Usuario"
                  autoComplete="username"
                  required
                  autoFocus
                />
              </label>

              <label className="lg-campo">
                {Icono.candado}
                <input
                  type={ver ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  aria-label="Contraseña"
                  autoComplete="current-password"
                  required
                />
                <button type="button" className="lg-ojo" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {ver ? Icono.ojoCerrado : Icono.ojo}
                </button>
              </label>

              <div className="lg-fila">
                <label className="lg-check">
                  <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
                  Recordarme
                </label>
                <button type="button" className="lg-link" onClick={olvide}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>


              <button type="submit" className="lg-btn primario" disabled={cargando}>{cargando ? 'Ingresando...' : <>Ingresar {Icono.flecha}</>}</button>

              <div className="lg-sep"><i /></div>

              <button type="button" className="lg-btn secundario" onClick={() => info('Solicitar una cuenta', 'Las cuentas las crea el administrador del sistema. Solicita tu acceso a tu coordinador.')}>
                <span style={{ display: "inline-flex", width: 20, height: 20 }}>{Icono.usuario}</span>
                Crear una cuenta
              </button>
            </form>
            )}

            <div className="lg-seguro">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V8a3 3 0 0 0-6 0z" /></svg>
              Tu información está segura con nosotros
            </div>
            <div className="lg-demo">
              Usuarios de prueba (clave: <b>demo1234</b>)
              <div className="lg-chips">
                {USUARIOS_DEMO.map((u) => (
                  <button key={u} type="button" className="lg-chip" onClick={() => setUsername(u)}>{u}</button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
