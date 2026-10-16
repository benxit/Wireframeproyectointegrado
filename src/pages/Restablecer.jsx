import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Marca } from '../components/Escudo';
import { fortaleza } from '../lib/seguridad';
import { ok, fallo, mensajeError } from '../lib/alertas';

export default function Restablecer() {
  const [q] = useSearchParams();
  const navigate = useNavigate();
  const [nueva, setNueva] = useState('');
  const [conf, setConf] = useState('');
  const [cargando, setCargando] = useState(false);
  const f = fortaleza(nueva);
  const uid = q.get('uid'); const token = q.get('token');

  async function enviar(e) {
    e.preventDefault();
    setCargando(true);
    try {
      await api.post('/auth/password/restablecer/', { uid, token, nueva });
      ok('Contraseña restablecida', 'Ya puedes iniciar sesión.');
      navigate('/login');
    } catch (err) {
      const d = err?.response?.data;
      fallo(d?.nueva?.[0] || mensajeError(err, 'No se pudo restablecer la contraseña.'));
    } finally { setCargando(false); }
  }

  return (
    <div className="rs-pag">
      <div className="rs-card">
        <Marca />
        <h1>Nueva contraseña</h1>
        {!uid || !token ? <p>El enlace no es válido. <Link to="/login">Volver al inicio</Link></p> : (
          <form onSubmit={enviar} className="cf-pila">
            <label className="cf-campo"><span className="cf-et">Nueva contraseña</span>
              <span className="cf-input"><input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" required /></span></label>
            <div className="medidor">
              <div className="med-barras">{[1, 2, 3, 4].map((n) => <i key={n} className={f.nivel >= n ? `n${f.nivel}` : ''} />)}<b className={`n${f.nivel}`}>{f.etiqueta}</b></div>
            </div>
            <label className="cf-campo"><span className="cf-et">Repetir contraseña</span>
              <span className="cf-input"><input type="password" value={conf} onChange={(e) => setConf(e.target.value)} autoComplete="new-password" required /></span></label>
            <button className="cf-btn pri" disabled={cargando || (!import.meta.env.DEV && f.nivel < 3) || nueva.length < 8 || nueva !== conf}>{cargando ? 'Guardando…' : 'Restablecer contraseña'}</button>
            <Link to="/login" className="lg-volver" style={{ textAlign: 'center' }}>Volver al inicio de sesión</Link>
          </form>
        )}
      </div>
    </div>
  );
}
