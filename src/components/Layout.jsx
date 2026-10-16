import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bell, Clock, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, Settings, UserCog } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { MENU, GRUPOS } from './menu';
import { Marca } from './Escudo';
import { confirmar, ok } from '../lib/alertas';
import { useTema } from '../context/ThemeContext';
import TemaSwitch from './TemaSwitch';
import FaroMini from './Faro';

const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function Reloj() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const fecha = t.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  const hh = String(t.getHours()).padStart(2, '0');
  const mm = String(t.getMinutes()).padStart(2, '0');
  return (
    <>
      <span className="tb-fecha">{fecha}</span>
      <span className="tb-reloj"><Clock size={16} /> {hh}<em className={t.getSeconds() % 2 ? 'off' : ''}>:</em>{mm}</span>
    </>
  );
}

export default function Layout() {
  const { usuario, logout, tieneRol } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { compacto, setCompacto } = useTema();
  const [menu, setMenu] = useState(false);
  const [panel, setPanel] = useState(null); // 'bell' | 'gear' | null
  const [q, setQ] = useState('');
  const [pend, setPend] = useState([]);
  const barra = useRef(null);

  useEffect(() => { setMenu(false); setPanel(null); setQ(''); }, [pathname]);
  // Campana: alertas operativas no revisadas del ámbito del usuario (RF-037). Se refresca al navegar.
  useEffect(() => {
    const cargar = () => api.get('/alertas/').then(({ data }) => setPend((data || []).filter((a) => !a.revisada))).catch(() => {});
    cargar();
    window.addEventListener('sgr:alertas', cargar);
    return () => window.removeEventListener('sgr:alertas', cargar);
  }, [pathname]);
  useEffect(() => {
    const cerrar = (e) => { if (barra.current && !barra.current.contains(e.target)) { setPanel(null); setQ(''); } };
    document.addEventListener('click', cerrar);
    return () => document.removeEventListener('click', cerrar);
  }, []);

  const items = useMemo(() => MENU.filter((i) => !i.roles || tieneRol(...i.roles)), [tieneRol]);
  const resultados = q ? items.filter((i) => norm(i.label).includes(norm(q))).slice(0, 6) : [];
  const nombre = `${usuario?.first_name || ''} ${usuario?.last_name || ''}`.trim() || usuario?.username || '';
  const rol = usuario?.roles?.join(', ') || 'Usuario';
  const esHome = pathname === '/';
  const reducir = useReducedMotion();

  async function salir() {
    const si = await confirmar({ titulo: '¿Cerrar sesión?', texto: 'Tendrás que volver a ingresar tus credenciales.', confirmar: 'Sí, salir' });
    if (!si) return;
    await logout();
    navigate('/login');
    ok('Sesión cerrada', '¡Hasta pronto!');
  }
  const link = (item) => {
    const Icon = item.icon;
    return (
      <motion.div key={item.to} className="nav-w" initial={{ opacity: 0, x: -26 }} animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 + items.indexOf(item) * 0.045, type: 'spring', stiffness: 140, damping: 16 }}>
        <NavLink to={item.to} end={item.to === '/'} title={compacto ? item.label : undefined}>
          {pathname === item.to && <motion.span layoutId="activo-sidebar" className="pill-activo" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          <Icon size={19} /><span>{item.label}</span>
        </NavLink>
      </motion.div>
    );
  };

  return (
    <div className="app">
      <aside className={`sidebar ${menu ? 'abierto' : ''} ${compacto ? 'compacto' : ''}`}>
        <div className="sb-cab">
          <Marca />
          <button type="button" className="sb-colapsar" onClick={() => setCompacto((c) => !c)} aria-label={compacto ? 'Desplegar menú' : 'Contraer menú'} title={compacto ? 'Desplegar menú' : 'Contraer menú'}>
            {compacto ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}<span>{compacto ? 'Abrir' : 'Contraer'}</span>
          </button>
        </div>
        <motion.div className="sb-user" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} title={compacto ? nombre : undefined}>
          <Link to="/configuracion" className="sb-av" aria-label="Mi cuenta">
            {usuario?.avatar ? <img src={usuario.avatar} alt="" /> : (nombre || '?')[0].toUpperCase()}<i />
          </Link>
          <div className="sb-user-txt"><b>{nombre}</b><small>{rol}</small><em><i /> En línea</em></div>
        </motion.div>

        <nav>
          {link(items[0])}
          {Object.keys(GRUPOS).map((g) => {
            const sub = items.filter((i) => i.grupo === g);
            return sub.length > 0 && (
              <div key={g} className="sb-grupo">
                <p>{GRUPOS[g]}</p>
                {sub.map((i) => link(i))}
              </div>
            );
          })}
        </nav>

        <div className="sb-pie">
          <FaroMini tam={54} />
          <b>La Serena</b><span>AVANZA CONTIGO</span>
          <div className="sb-estado"><strong>SGR · Gestión de Resultados</strong><em><i /> <span>Sistema operativo</span></em><small>v1.0.0</small></div>
        </div>
      </aside>
      <div className={`velo ${menu ? 'abierto' : ''}`} onClick={() => setMenu(false)} />

      <div className={`contenido ${esHome ? 'es-home' : ''}`}
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`); }}>
        {!reducir && (
          <motion.div key={pathname} className="cortina" initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: [0, 1, 1, 0], originX: [0, 0, 1, 1] }} transition={{ duration: 0.8, times: [0, 0.42, 0.58, 1], ease: 'easeInOut' }}>
            <svg viewBox="0 0 64 78" aria-hidden="true"><path d="M3 3h58v36c0 18-14 30-29 36C17 69 3 57 3 39z" fill="none" stroke="#fff" strokeWidth="3" /><path d="M20 44V28h4v-4h3v4h4v-6h2v6h4v-4h3v4h4v16z" fill="#fff" /></svg>
          </motion.div>
        )}
        {esHome && (
          <svg className="ola-lateral" viewBox="0 0 90 340" preserveAspectRatio="none" aria-hidden="true">
            <motion.path d="M0 0H30C60 40 10 90 40 150C68 210 20 260 50 340H0Z" fill="#8f0a18" animate={{ d: ['M0 0H30C60 40 10 90 40 150C68 210 20 260 50 340H0Z', 'M0 0H40C20 50 56 100 26 160C0 215 52 270 34 340H0Z', 'M0 0H30C60 40 10 90 40 150C68 210 20 260 50 340H0Z'] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
          </svg>
        )}
        <header className="topbar" ref={barra}>
          <button className="hamb" onClick={() => setMenu((m) => !m)} aria-label="Abrir menú"><Menu size={22} /></button>
          <Reloj />

          <div className="tb-buscar">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en el sistema..."
              onKeyDown={(e) => { if (e.key === 'Enter' && resultados[0]) navigate(resultados[0].to); }} />
            <AnimatePresence>
              {resultados.length > 0 && (
                <motion.div className="tb-panel tb-res" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {resultados.map((r) => <Link key={r.to} to={r.to}><r.icon size={15} /> {r.label}</Link>)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <TemaSwitch />

          <div className="tb-wrap">
            <button className={`tb-ico ${pend.length ? 'suena' : ''}`} onClick={() => setPanel(panel === 'bell' ? null : 'bell')} aria-label="Alertas">
              <Bell size={21} />
              {pend.length > 0 && <span className="tb-badge">{pend.length > 9 ? '9+' : pend.length}</span>}
            </button>
            <AnimatePresence>
              {panel === 'bell' && (
                <motion.div className="tb-panel" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}>
                  <p className="tb-ph">Alertas</p>
                  {pend.length === 0 && <p className="tb-vacio">Estás al día. No hay alertas.</p>}
                  {pend.slice(0, 5).map((a) => <Link key={a.clave} to={a.enlace}><span className="dotr" />{a.motivo}</Link>)}
                  {pend.length > 0 && <Link to="/alertas" className="tb-cfg">Ver todas las alertas</Link>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="tb-wrap">
            <button className="tb-ico" onClick={() => setPanel(panel === 'gear' ? null : 'gear')} aria-label="Cuenta"><Settings size={21} /></button>
            <AnimatePresence>
              {panel === 'gear' && (
                <motion.div className="tb-panel" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}>
                  <p className="tb-ph">{nombre}</p><p className="tb-vacio">{rol}</p>
                  <Link to="/configuracion" className="tb-cfg"><UserCog size={15} /> Configuración de cuenta</Link>
                  <button className="tb-salir" onClick={salir}><LogOut size={15} /> Cerrar sesión</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <main className="main">
          <AnimatePresence mode="wait">
            <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
