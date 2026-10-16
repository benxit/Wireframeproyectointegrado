import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';

/**
 * Escena animada: el viento dibuja espirales, un papel vuela y el faro (el "0" del medio) gira su haz.
 * Usada para "Página no encontrada" (404) y "Sistema no disponible" (503).
 */
export function Escena({ digitos = ['4', '0', '4'] }) {
  const estelas = [
    { d: 'M20 120C90 40 180 200 260 110S380 30 430 90', delay: 0 },
    { d: 'M60 170C140 120 210 230 300 160S440 120 560 160', delay: 0.9 },
    { d: 'M30 60C110 20 160 90 240 50S400 10 540 70', delay: 1.8 },
  ];
  return (
    <div className="e404" aria-hidden="true">
      <svg viewBox="0 0 600 280" role="img">
        <defs>
          <linearGradient id="e4haz" x1="0" x2="1"><stop offset="0" stopColor="#ffe08a" stopOpacity=".95" /><stop offset="1" stopColor="#ffe08a" stopOpacity="0" /></linearGradient>
          <linearGradient id="e4t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a8d98" /><stop offset="1" stopColor="#5d606c" /></linearGradient>
        </defs>
        <text x="30" y="226" className="e4-num" fill="url(#e4t)">{digitos[0]}</text>
        <text x="372" y="226" className="e4-num" fill="url(#e4t)">{digitos[2]}</text>
        {/* faro = el "0" */}
        <g className="e4-faro">
          <g className="e4-haz" style={{ transformOrigin: '300px 74px' }}>
            <path d="M300 74L-120 20V128Z" fill="url(#e4haz)" /><path d="M300 74L720 20V128Z" fill="url(#e4haz)" />
          </g>
          <path d="M262 232L276 92H324L338 232Z" fill="#fff" stroke="#c9ccd6" strokeWidth="2" />
          <path d="M270 150H330L333 178H267ZM265 200H335L338 232H262ZM278 108H322L323 122H277Z" fill="#c4182c" />
          <rect x="268" y="84" width="64" height="10" rx="3" fill="#3a1424" />
          <rect x="280" y="52" width="40" height="32" rx="4" fill="#ffd966" className="e4-luz" />
          <path d="M274 52L300 28L326 52Z" fill="#c4182c" /><circle cx="300" cy="24" r="5" fill="#3a1424" />
        </g>
        <path d="M0 236H600" stroke="#b9bcc7" strokeWidth="2" />
        <path className="e4-ola" d="M0 246Q30 238 60 246T120 246T180 246T240 246T300 246T360 246T420 246T480 246T540 246T600 246" fill="none" stroke="#9fb7d4" strokeWidth="2" />
        {estelas.map((e, i) => (
          <motion.path key={i} d={e.d} fill="none" stroke={i === 1 ? '#b30d1e' : '#4a4d5a'} strokeWidth={i === 1 ? 3.5 : 2.5} strokeLinecap="round" opacity=".8"
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: [0, 1, 1], opacity: [0, 0.85, 0], pathOffset: [0, 0, 1] }}
            transition={{ duration: 4.2, repeat: Infinity, delay: e.delay, ease: 'easeInOut' }} />
        ))}
        {/* papelito llevado por el viento */}
        <motion.g animate={{ x: [-40, 640], y: [0, -30, 20, -10, 10], rotate: [0, 40, -20, 30, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}>
          <path d="M0 140l22-9-6 18-5-5z" fill="#fff" stroke="#b30d1e" strokeWidth="1.6" strokeLinejoin="round" />
        </motion.g>
      </svg>
    </div>
  );
}

export default function Pagina404() {
  const navigate = useNavigate();
  return (
    <div className="e404-wrap">
      <Escena digitos={['4', '0', '4']} />
      <motion.div className="e404-txt" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <small>ERROR 404</small>
        <h1>Página no encontrada</h1>
        <p>Aquí solo sopla el viento.</p>
        <div className="e404-btns">
          <Link to="/" className="e404-btn pri">Llévame al inicio <ArrowRight size={16} /></Link>
          <button type="button" className="e404-btn" onClick={() => navigate(-1)}>Volver</button>
        </div>
      </motion.div>
    </div>
  );
}

export function PanelCaida({ reintentando, onReintentar }) {
  return (
    <div className="e404-wrap caida">
      <Escena digitos={['5', '0', '3']} />
      <motion.div className="e404-txt" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <small>ERROR DE CONEXIÓN</small>
        <h1>Sistema no disponible</h1>
        <p>No logramos conectar con el servidor. Estamos reintentando automáticamente.</p>
        <div className="e404-btns">
          <button type="button" className="e404-btn pri" onClick={onReintentar} disabled={reintentando}>
            <RefreshCw size={16} className={reintentando ? 'girando' : ''} /> {reintentando ? 'Reconectando…' : 'Reintentar ahora'}
          </button>
        </div>
        <span className="e404-pulso"><i /><i /><i /></span>
      </motion.div>
    </div>
  );
}
