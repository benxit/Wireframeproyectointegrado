import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartHandshake, Plus, ChevronDown, ChevronUp, Search, ShieldCheck } from 'lucide-react';
import { ok, fallo, mensajeError } from '../lib/alertas';
import { lista } from '../lib/descargas';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const TIPOS_GESTION = [
  { value: 'orientacion', label: 'Orientación' },
  { value: 'derivacion', label: 'Derivación' },
  { value: 'entrega_beneficio', label: 'Entrega de beneficio' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'otro', label: 'Otro' },
];

export default function AtencionSocial() {
  const { usuario } = useAuth();
  const [casos, setCasos] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [delegaciones, setDelegaciones] = useState([]);
  const [formCaso, setFormCaso] = useState({});
  const [error, setError] = useState('');
  const [expandido, setExpandido] = useState(null);
  const [formGestion, setFormGestion] = useState({});

  async function cargar(q = buscar) {
    try {
      const [c, d] = await Promise.all([api.get('/casos-sociales/', { params: q ? { buscar: q } : {} }), api.get('/delegaciones/')]);
      setCasos(lista(c.data));
      const activas = lista(d.data).filter((x) => x.estado === 'activa');
      setDelegaciones(activas);
      setFormCaso((f) => (f.delegacion ? f : { ...f, delegacion: usuario?.delegacion || activas[0]?.id || '' }));
    } catch (err) {
      fallo(mensajeError(err, 'No se pudieron cargar los casos.'));
    }
  }
  useEffect(() => { cargar(); }, []);

  async function crearCaso(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/casos-sociales/', formCaso);
      setFormCaso({ delegacion: formCaso.delegacion });
      cargar();
      ok('Caso social creado', 'El identificador se guardó cifrado.');
    } catch (err) {
      const d = err.response?.data;
      setError(d?.identificador_persona?.[0] || d?.nombre_persona?.[0] || mensajeError(err, 'No se pudo crear el caso.'));
    }
  }

  async function agregarGestion(casoId) {
    const datos = formGestion[casoId];
    if (!datos?.tipo || !datos?.fecha) { fallo('Indica el tipo y la fecha de la gestión.'); return; }
    try {
      await api.post('/gestiones-sociales/', { caso: casoId, ...datos });
      setFormGestion((f) => ({ ...f, [casoId]: {} }));
      cargar();
      ok('Gestión agregada al caso');
    } catch (err) {
      fallo(err.response?.data?.caso?.[0] || mensajeError(err, 'No se pudo agregar la gestión.'));
    }
  }

  const campoClase = 'w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition text-sm';
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="font-display text-2xl text-stone-900 mb-1 flex items-center gap-2">
        <HeartHandshake size={22} className="text-brand-600" /> Atención social
      </h1>
      <p className="text-sm text-stone-500 mb-1">
        Cada persona tiene un único caso, con hasta <b>3 gestiones</b> registradas (RN-012).
      </p>
      <p className="text-xs text-stone-400 mb-4 flex items-center gap-1.5">
        <ShieldCheck size={13} /> RUT y nombre se guardan cifrados. En los listados el RUT aparece enmascarado.
      </p>

      <form onSubmit={crearCaso} className="bg-white border border-stone-200 rounded-xl p-5 mb-6 max-w-xl">
        {error && <div className="text-sm text-brand-700 bg-brand-50 rounded-lg px-3 py-2 mb-3" role="alert">{error}</div>}
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label htmlFor="s-rut" className="block text-sm font-medium text-stone-700 mb-1">Identificador (RUT u otro documento)</label>
            <input id="s-rut" className={campoClase} placeholder="12.345.678-5" value={formCaso.identificador_persona || ''}
              onChange={(e) => setFormCaso((f) => ({ ...f, identificador_persona: e.target.value }))} required /></div>
          <div><label htmlFor="s-nombre" className="block text-sm font-medium text-stone-700 mb-1">Nombre de la persona</label>
            <input id="s-nombre" className={campoClase} value={formCaso.nombre_persona || ''} maxLength={60}
              onChange={(e) => setFormCaso((f) => ({ ...f, nombre_persona: e.target.value }))} required /></div>
          <div className="sm:col-span-2"><label htmlFor="s-del" className="block text-sm font-medium text-stone-700 mb-1">Delegación</label>
            <select id="s-del" className={campoClase} value={formCaso.delegacion || ''}
              onChange={(e) => setFormCaso((f) => ({ ...f, delegacion: e.target.value }))} required>
              <option value="">-- Seleccione --</option>
              {delegaciones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select></div>
        </div>
        <button type="submit" className="mt-4 flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <Plus size={16} /> Crear caso
        </button>
      </form>

      <form onSubmit={(e) => { e.preventDefault(); cargar(); }} className="flex flex-wrap gap-2 mb-4 max-w-xl">
        <input className="px-3 py-2 rounded-lg border border-stone-300 text-sm flex-1 min-w-[12rem]" placeholder="Buscar caso por RUT (ej: 12.345.678-5)"
          value={buscar} onChange={(e) => setBuscar(e.target.value)} aria-label="Buscar caso por RUT" />
        <button type="submit" className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-700 text-white text-sm px-3 py-2 rounded-lg transition"><Search size={14} /> Buscar</button>
        {buscar && <button type="button" onClick={() => { setBuscar(''); cargar(''); }} className="text-sm text-stone-500 hover:text-stone-700 px-2">Limpiar</button>}
      </form>

      <div className="space-y-3">
        {casos.map((caso) => {
          const abierto = expandido === caso.id;
          const lleno = caso.cantidad_gestiones >= 3;
          return (
            <div key={caso.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandido(abierto ? null : caso.id)}
                aria-expanded={abierto}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-stone-50 transition"
              >
                <div>
                  <p className="font-medium text-stone-800">{caso.nombre_persona}</p>
                  <p className="text-xs text-stone-500">
                    {caso.identificador_enmascarado} · {caso.delegacion_nombre}{caso.responsable_nombre ? ` · ${caso.responsable_nombre}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${lleno ? 'bg-stone-100 text-stone-500' : 'bg-brand-50 text-brand-700'}`}>
                    {caso.cantidad_gestiones} / 3 gestiones
                  </span>
                  {abierto ? <ChevronUp size={18} className="text-stone-400" /> : <ChevronDown size={18} className="text-stone-400" />}
                </div>
              </button>

              <AnimatePresence>
                {abierto && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-stone-200 px-5 py-4"
                  >
                    <ul className="space-y-2 mb-4">
                      {caso.gestiones.map((g) => (
                        <li key={g.id} className="flex items-center justify-between text-sm bg-stone-50 rounded-lg px-3 py-2">
                          <span>
                            <span className="text-xs text-stone-400 mr-1.5">Etapa {g.etapa}</span>
                            <b className="text-stone-700">{TIPOS_GESTION.find((t) => t.value === g.tipo)?.label || g.tipo}</b>
                            {' '}— {g.fecha} {g.resultado && `· ${g.resultado}`}
                          </span>
                          <span className="text-xs text-stone-400">{g.funcionario_nombre}</span>
                        </li>
                      ))}
                      {caso.gestiones.length === 0 && <p className="text-sm text-stone-400">Sin gestiones aún.</p>}
                    </ul>

                    {!lleno ? (
                      <div className="flex flex-wrap items-end gap-2">
                        <select
                          className="px-3 py-2 rounded-lg border border-stone-300 text-sm"
                          aria-label="Tipo de gestión"
                          value={formGestion[caso.id]?.tipo || ''}
                          onChange={(e) => setFormGestion((f) => ({ ...f, [caso.id]: { ...f[caso.id], tipo: e.target.value } }))}
                        >
                          <option value="">Tipo de gestión</option>
                          {TIPOS_GESTION.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <input type="date" max={hoy} aria-label="Fecha de la gestión" className="px-3 py-2 rounded-lg border border-stone-300 text-sm"
                          value={formGestion[caso.id]?.fecha || ''}
                          onChange={(e) => setFormGestion((f) => ({ ...f, [caso.id]: { ...f[caso.id], fecha: e.target.value } }))} />
                        <input placeholder="Resultado (opcional)" aria-label="Resultado" maxLength={255} className="px-3 py-2 rounded-lg border border-stone-300 text-sm flex-1 min-w-[160px]"
                          value={formGestion[caso.id]?.resultado || ''}
                          onChange={(e) => setFormGestion((f) => ({ ...f, [caso.id]: { ...f[caso.id], resultado: e.target.value } }))} />
                        <button onClick={() => agregarGestion(caso.id)}
                          className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-3 py-2 rounded-lg transition">
                          Agregar
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-stone-500">Este caso ya alcanzó el máximo de 3 gestiones (RN-012).</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {casos.length === 0 && <p className="text-stone-400 text-sm">{buscar ? 'No hay un caso para ese RUT en tu ámbito.' : 'Sin casos registrados.'}</p>}
      </div>
    </div>
  );
}
