import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Building2, Users, ClipboardList, Target, ArrowRight, ArrowUp, ArrowDown, CalendarDays, User, MapPin, HeartHandshake, FileText, TrendingUp, Trophy, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboard, DEMO, fmtFecha } from '../hooks/useDashboard';
import Contador from '../components/dash/Contador';
import Tilt, { GRUPO } from '../components/dash/Tilt';
import Faro from '../components/dash/Faro';
import { confeti, ok } from '../lib/alertas';

const ICONO_KPI = { deleg: Building2, func: Users, act: ClipboardList, cump: Target };
const RUTA_KPI = { deleg: '/delegaciones', func: '/usuarios', act: '/actividades', cump: '/tablero-delegacion' };
const tier = (p) => (p >= 85 ? '#2fa860' : p >= 70 ? '#e3a21a' : p >= 60 ? '#e8742a' : '#cf1b2e');
const PILL = { Reunión: 'p-rojo', Terreno: 'p-azul', Atención: 'p-verde', Interna: 'p-ambar', Ingresado: 'p-azul', Pendiente: 'p-ambar', 'En proceso': 'p-verde', Realizado: 'p-verde' };
const ICO_AGENDA = [Users, MapPin, HeartHandshake, FileText];
const FRASES = [
  { t: 'Una comuna más cercana, con una gestión más eficiente.', pos: '78% 55%' },
  { t: 'Medir para mejorar: cada actividad cuenta.', pos: '15% 70%' },
  { t: 'Juntos construimos una mejor ciudad.', pos: '55% 35%' },
];
// Formas aproximadas de cada delegación sobre el mapa (hasta 8) y posición de su pin
const MAPA = [
  ['M60 30L110 22L130 50L100 78L62 66Z', 88, 50], ['M110 22L168 28L182 62L130 50Z', 148, 38], ['M168 28L232 40L236 84L182 62Z', 205, 58],
  ['M62 66L100 78L96 120L58 110Z', 78, 90], ['M100 78L130 50L182 62L176 112L136 126L96 120Z', 140, 90], ['M182 62L236 84L228 132L176 112Z', 205, 105],
  ['M58 110L96 120L136 126L120 168L72 160Z', 96, 138], ['M136 126L176 112L228 132L200 170L120 168Z', 165, 145],
];

function Anillo({ pct, size = 150, trazo = 14, children }) {
  const r = (size - trazo) / 2;
  const c = 2 * Math.PI * r;
  const p = { cx: size / 2, cy: size / 2, r, fill: 'none', strokeWidth: trazo };
  return (
    <div className="anillo" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle {...p} stroke="#f3e6e8" />
        <motion.circle {...p} stroke="url(#gAnillo)" strokeLinecap="round" strokeDasharray={c} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct / 100) }} transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1], delay: 0.5 }} />
      </svg>
      <div className="anillo-centro">{children}</div>
    </div>
  );
}

function Cabecera({ icono: Icono, titulo, to, enlace }) {
  return (
    <div className="cab">
      <span className="cab-ic"><Icono size={15} /></span>
      <h3>{titulo}</h3>
      {to && <Link to={to}>{enlace} <ArrowRight size={13} /></Link>}
    </div>
  );
}

function Carrusel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % FRASES.length), 4500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="carrusel">
      <AnimatePresence mode="wait">
        <motion.div key={i} className="slide" style={{ backgroundPosition: FRASES[i].pos }}
          initial={{ opacity: 0, scale: 1.12 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}>
          <motion.p initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>“{FRASES[i].t}”</motion.p>
        </motion.div>
      </AnimatePresence>
      <div className="dots">{FRASES.map((_, k) => <button key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Frase ${k + 1}`} />)}</div>
    </div>
  );
}

export default function Home() {
  const { usuario } = useAuth();
  const real = useDashboard();
  const [demo, setDemo] = useState(false);
  const d = demo ? DEMO : real;
  const [hover, setHover] = useState(null);
  const nombre = `${usuario?.first_name || ''} ${usuario?.last_name || ''}`.trim() || usuario?.username;
  const top = d.delegaciones[0];
  const sinSerie = d.serie.length === 0;

  // Celebración (una vez por sesión) cuando el cumplimiento general supera la meta
  useEffect(() => {
    if (d.cargando || d.cumplimiento < 85) return undefined;
    const t = setTimeout(() => {
      if (sessionStorage.getItem('sgr_celebrado')) return;
      sessionStorage.setItem('sgr_celebrado', '1');
      confeti({ y: 0.25 });
      ok('¡Excelente gestión!', `Cumplimiento general de ${d.cumplimiento}%, sobre la meta.`);
    }, 1800);
    return () => clearTimeout(t);
  }, [d.cargando, d.cumplimiento]);

  return (
    <div className={`home2 ${real.cargando && !demo ? 'cargando' : ''}`}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs><linearGradient id="gAnillo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e11d31" /><stop offset="1" stopColor="#8f0a18" /></linearGradient></defs>
      </svg>

      {/* ---------- Banner ---------- */}
      <section className="banner">
        <div className="banner-foto" />
        <div className="banner-vel" />
        <div className="particulas">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ left: `${(i * 5.7 + 3) % 97}%`, animationDelay: `${i * 0.7}s`, animationDuration: `${8 + (i % 5) * 2}s` }} />)}</div>
        <div className="banner-texto">
          <motion.p initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="b-hola">Bienvenido/a,</motion.p>
          <h1 aria-label={nombre}>{[...nombre].map((ch, i) => (
            <motion.span key={i} aria-hidden="true" style={{ display: 'inline-block', whiteSpace: 'pre' }} initial={{ opacity: 0, y: 34, rotate: 9 }} animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ delay: 0.4 + i * 0.04, type: 'spring', stiffness: 220, damping: 13 }}>{ch}</motion.span>
          ))}</h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="b-sub">Aquí puedes gestionar y hacer seguimiento<br />de los resultados de las delegaciones municipales.</motion.p>
          <motion.span initial={{ width: 0 }} animate={{ width: 56 }} transition={{ delay: 0.9, duration: 0.6 }} className="b-barra" />
        </div>
        <motion.div className="banner-sello" initial={{ opacity: 0, rotate: -14, scale: 0.8 }} animate={{ opacity: 1, rotate: -8, scale: 1 }} transition={{ delay: 0.8, type: 'spring' }}>
          <motion.b animate={{ y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>La Serena<br />siempre cerca</motion.b>
          <svg viewBox="0 0 160 14"><motion.path d="M2 10 C 40 2, 100 2, 158 8" fill="none" stroke="#b30d1e" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.2, duration: 1 }} /></svg>
        </motion.div>
        <button className={`demo-sw ${demo ? 'on' : ''}`} onClick={() => setDemo((v) => !v)} title="Alterna entre los datos reales de tu base y un set de ejemplo">
          <Sparkles size={13} /> {demo ? 'Datos de ejemplo' : 'Datos reales'}
        </button>
      </section>

      <motion.div className="dash" variants={GRUPO} initial="oculto" animate="visible" key={demo ? 'demo' : 'real'}>
        <div className="dash-izq">
          {/* ---------- KPIs ---------- */}
          <div className="kpis">
            {d.kpis.map((k) => {
              const Icono = ICONO_KPI[k.id];
              return (
                <Tilt key={k.id} className="kpi">
                  <span className="kpi-ic"><Icono size={22} /></span>
                  <p className="kpi-l">{k.label}</p>
                  <p className="kpi-v"><Contador valor={k.valor} sufijo={k.sufijo} /></p>
                  <p className={`kpi-d ${k.delta ? (k.delta.up ? 'sube' : 'baja') : ''}`}>
                    {k.delta && (k.delta.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}<b>{k.delta?.txt}</b> {k.sub}
                  </p>
                  <Link to={RUTA_KPI[k.id]} className="kpi-go" aria-label={`Ir a ${k.label}`}><ArrowRight size={15} /></Link>
                </Tilt>
              );
            })}
          </div>

          {/* ---------- Avance + últimos ingresos ---------- */}
          <div className="fila2">
            <Tilt max={3} className="avance">
              <Cabecera icono={TrendingUp} titulo="Avance general de la delegación" />
              <div className="avance-cuerpo">
                <Anillo pct={d.cumplimiento} size={158} trazo={15}>
                  <b><Contador valor={d.cumplimiento} sufijo="%" /></b><span>Cumplimiento</span>
                </Anillo>
                <div className="grafico">
                  <p className="g-t">Evolución de cumplimiento</p>
                  {sinSerie ? (
                    <div className="g-vacio"><motion.svg viewBox="0 0 200 60"><motion.path d="M0 50 C 40 48, 60 30, 100 32 S 160 14, 200 8" fill="none" stroke="#e8c4c9" strokeWidth="3" strokeDasharray="6 6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }} /></motion.svg>
                      <span>Aún no hay suficientes meses con actividades para graficar.<br /><button onClick={() => setDemo(true)}>Ver con datos de ejemplo</button></span></div>
                  ) : (
                    <ResponsiveContainer width="100%" height={176}>
                      <AreaChart data={d.serie} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <defs><linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b30d1e" stopOpacity=".3" /><stop offset="1" stopColor="#b30d1e" stopOpacity="0" /></linearGradient></defs>
                        <CartesianGrid vertical={false} stroke="#f0e9ea" />
                        <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8a8f9c' }} />
                        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8a8f9c' }} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: 0, boxShadow: '0 12px 30px rgba(0,0,0,.16)', fontSize: 12 }} formatter={(v, n) => [`${v}%`, n]} />
                        <Area type="monotone" dataKey="meta" name="Meta" stroke="#c4c7d0" strokeDasharray="5 5" strokeWidth={2} fill="none" animationDuration={1600} />
                        <Area type="monotone" dataKey="actual" name="Actual" connectNulls stroke="#b30d1e" strokeWidth={3} fill="url(#gArea)" dot={{ r: 3, fill: '#fff', stroke: '#b30d1e', strokeWidth: 2 }} activeDot={{ r: 6 }} animationDuration={2000} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </Tilt>

            <Tilt max={3} className="ultimos">
              <Cabecera icono={ClipboardList} titulo="Últimos ingresos" to="/actividades" enlace="Ver todos" />
              {d.ultimos.length === 0 && <p className="vacio">Aún no hay actividades registradas.</p>}
              {d.ultimos.map((u, i) => (
                <motion.div key={i} className="ult-item" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.12 }}>
                  <span className="ult-av"><User size={16} /></span>
                  <div><b>{u.t}</b><small>{u.s}</small></div>
                  <time>{u.f}</time>
                </motion.div>
              ))}
            </Tilt>
          </div>

          {/* ---------- Resumen de la gestión ---------- */}
          <Tilt max={2} className="resumen">
            <div className="cab">
              <span className="cab-ic"><FileText size={15} /></span><h3>Resumen de la gestión</h3>
              {d.periodo && <span className="periodo"><CalendarDays size={14} /> Periodo actual: {fmtFecha(d.periodo.inicio)} – {fmtFecha(d.periodo.fin)}</span>}
            </div>
            <div className="resumen-cuerpo">
              <Carrusel />
              <div className="mini-stats">
                {d.resumen.map((r, i) => (
                  <motion.div key={r.l} className="mini" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }} whileHover={{ y: -4 }}>
                    <small>{r.l}</small>
                    <b><Contador valor={r.v} /></b>
                    {r.d && <span className={r.up ? 'sube' : 'baja'}>{r.up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{r.d}</span>}
                  </motion.div>
                ))}
              </div>
            </div>
          </Tilt>

          {/* ---------- Delegaciones + semáforo ---------- */}
          <div className="fila2 fila-pie">
            <Tilt max={2} className="deleg">
              <Cabecera icono={Building2} titulo="Delegaciones" to="/tablero-delegacion" enlace="Ver todas" />
              {d.delegaciones.length === 0 ? <p className="vacio">Disponible para Administrador y Coordinador (o aún no hay delegaciones).</p> : (
                <div className="deleg-cuerpo">
                  <ul>
                    {d.delegaciones.slice(0, 8).map((x, i) => (
                      <li key={x.id} className={hover === i ? 'hv' : ''} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                        <i style={{ background: tier(x.pct) }} /><span>{x.nombre}</span><b><Contador valor={x.pct} sufijo="%" duracion={1.2} /></b>
                      </li>
                    ))}
                  </ul>
                  <div className="mapa">
                    <svg viewBox="0 0 300 190">
                      <path d="M0 0L60 30L62 66L58 110L72 160L90 190H0Z" fill="#e6f1fa" />
                      <motion.path d="M-20 70 Q10 62 40 70 T100 70" fill="none" stroke="#bcd9ee" strokeWidth="1.5" animate={{ x: [0, 14, 0] }} transition={{ duration: 5, repeat: Infinity }} />
                      <motion.path d="M-20 110 Q10 102 40 110 T100 110" fill="none" stroke="#bcd9ee" strokeWidth="1.5" animate={{ x: [0, -12, 0] }} transition={{ duration: 6, repeat: Infinity }} />
                      {d.delegaciones.slice(0, 8).map((x, i) => (
                        <motion.path key={x.id} d={MAPA[i][0]} stroke="#fff" strokeWidth="2.5" strokeLinejoin="round"
                          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1, fill: hover === i ? tier(x.pct) : '#f6cdd2' }} transition={{ delay: 0.6 + i * 0.08 }}
                          onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ transformOrigin: `${MAPA[i][1]}px ${MAPA[i][2]}px`, cursor: 'pointer' }} />
                      ))}
                      {d.delegaciones.slice(0, 8).map((x, i) => (
                        <g key={`p${x.id}`} pointerEvents="none">
                          <motion.circle cx={MAPA[i][1]} cy={MAPA[i][2]} r="5" fill="none" stroke="#b30d1e" animate={{ r: [4, 14], opacity: [0.8, 0] }} transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.3 }} />
                          <circle cx={MAPA[i][1]} cy={MAPA[i][2]} r="4" fill="#b30d1e" stroke="#fff" strokeWidth="1.5" />
                        </g>
                      ))}
                      <text x="14" y="96" fontSize="8" fontStyle="italic" fill="#6c8fb0">Océano</text><text x="14" y="106" fontSize="8" fontStyle="italic" fill="#6c8fb0">Pacífico</text>
                    </svg>
                    <AnimatePresence>
                      {hover !== null && d.delegaciones[hover] && (
                        <motion.div className="mapa-tip" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <b>{d.delegaciones[hover].nombre}</b> · {d.delegaciones[hover].pct}%
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <span className="norte">N</span>
                  </div>
                </div>
              )}
            </Tilt>

            <Tilt max={2} className="semaforo">
              <Cabecera icono={ShieldCheck} titulo="Semáforo de avance" to="/tablero-delegacion" enlace="Ver detalle" />
              {d.delegaciones.length === 0 && <p className="vacio">Sin datos de delegaciones para mostrar.</p>}
              {d.delegaciones.slice(0, 8).map((x, i) => (
                <div key={x.id} className={`sem-fila ${hover === i ? 'hv' : ''}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <i style={{ background: tier(x.pct) }} /><span>Delegación {x.nombre}</span>
                  <div className="barra"><motion.div className="rell" style={{ background: `linear-gradient(90deg, ${tier(x.pct)}aa, ${tier(x.pct)})` }}
                    initial={{ width: 0 }} animate={{ width: `${Math.max(x.pct, 2)}%` }} transition={{ delay: 0.7 + i * 0.1, duration: 1.2, ease: [0.22, 1, 0.36, 1] }} /></div>
                  <b>{x.pct}%</b>
                </div>
              ))}
            </Tilt>
          </div>
        </div>

        {/* ---------- Columna derecha ---------- */}
        <div className="dash-der">
          <Tilt className="destacada" onClick={(e) => confeti({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight, cantidad: 80 })}>
            <div className="dest-foto"><Anillo pct={top?.pct ?? 0} size={62} trazo={6}><b>{top?.pct ?? 0}%</b></Anillo></div>
            <div className="dest-txt">
              <small><Trophy size={13} /> Delegación destacada</small>
              <h4>{top ? `Delegación ${top.nombre}` : 'Sin datos aún'}</h4>
              <p>Mayor cumplimiento del mes</p>
              <Link to="/tablero-delegacion" className="kpi-go" aria-label="Ver tablero"><ArrowRight size={15} /></Link>
            </div>
          </Tilt>

          <Tilt max={3} className="agenda">
            <Cabecera icono={CalendarDays} titulo={d.agendaHoy ? 'Agenda de hoy' : 'Próximos compromisos'} to="/agenda" enlace="Ver agenda" />
            {d.agenda.length === 0 && <p className="vacio">No hay compromisos próximos.</p>}
            {d.agenda.map((a, i) => {
              const Ico = ICO_AGENDA[i % ICO_AGENDA.length];
              return (
                <motion.div key={i} className="ag-item" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.12 }}>
                  <div className="ag-h"><b>{a.hora}</b><i /></div>
                  <span className="ag-ic"><Ico size={16} /></span>
                  <div className="ag-t"><b>{a.t}</b><small>{a.s}</small></div>
                  <span className={`pill ${PILL[a.estado] || 'p-azul'}`}>{a.estado}</span>
                </motion.div>
              );
            })}
          </Tilt>

          <Tilt max={5} className="foto-card">
            <Faro />
            <motion.p className="foto-script" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>La Serena<br />es su gente</motion.p>
            <p className="foto-frase">“Juntos construimos<br />una mejor ciudad”</p>
          </Tilt>
        </div>
      </motion.div>
    </div>
  );
}
