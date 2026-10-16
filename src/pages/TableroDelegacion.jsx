import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { Download, ChevronRight } from 'lucide-react';
import api from '../api/client';
import Semaforo from '../components/Semaforo';
import { fallo, mensajeError } from '../lib/alertas';
import { useAuth } from '../context/AuthContext';
import { descargar, lista } from '../lib/descargas';

const COLOR_SEMAFORO = { verde: '#10b981', ambar: '#f59e0b', rojo: '#b8211f' };

export default function TableroDelegacion() {
  const { usuario } = useAuth();
  const [periodos, setPeriodos] = useState([]);
  const [delegaciones, setDelegaciones] = useState([]);
  const [periodoId, setPeriodoId] = useState('');
  const [delegacionId, setDelegacionId] = useState('');
  const [tablero, setTablero] = useState(null);
  const [cargos, setCargos] = useState([]);

  const campoClase = 'px-3 py-1.5 rounded-lg border border-stone-300 text-sm';

  useEffect(() => {
    api.get('/periodos/').then(({ data }) => {
      const l = lista(data);
      setPeriodos(l);
      const abierto = l.find((p) => p.estado === 'abierto') || l[0];
      if (abierto) setPeriodoId(abierto.id);
    });
    api.get('/delegaciones/').then(({ data }) => {
      const l = lista(data);
      setDelegaciones(l);
      const propia = l.find((d) => d.id === usuario?.delegacion) || l[0];
      if (propia) setDelegacionId(propia.id);
    });
  }, []);

  useEffect(() => {
    if (!periodoId || !delegacionId) return;
    const p = { periodo: periodoId, delegacion: delegacionId };
    api.get('/tablero/delegacion/', { params: p })
      .then(({ data }) => setTablero(data))
      .catch((err) => { setTablero(null); fallo(mensajeError(err, 'No se pudo cargar el tablero.')); });
    api.get('/tablero/cargos/', { params: p }).then(({ data }) => setCargos(data)).catch(() => setCargos([]));
  }, [periodoId, delegacionId]);

  const datosGrafico = (tablero?.funcionarios || []).filter((f) => f.indicadores.length).map((f) => ({
    nombre: f.funcionario.split(' ')[0], resultado: Number(f.resultado_ponderado_total), semaforo: f.semaforo,
  }));
  const ag = tablero?.agenda;

  return (
    <div>
      <h1 className="font-display text-2xl text-stone-900 mb-4">Tablero de delegación</h1>

      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label htmlFor="td-del" className="text-xs text-stone-500 block mb-1">Delegación</label>
          <select id="td-del" className={campoClase} value={delegacionId} onChange={(e) => setDelegacionId(e.target.value)}>
            {delegaciones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="td-per" className="text-xs text-stone-500 block mb-1">Periodo</label>
          <select id="td-per" className={campoClase} value={periodoId} onChange={(e) => setPeriodoId(e.target.value)}>
            {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.estado === 'cerrado' ? ' (cerrado)' : ''}</option>)}
          </select>
        </div>
        <button type="button" disabled={!tablero}
          onClick={() => descargar('/informes/tablero-delegacion.csv', { periodo: periodoId, delegacion: delegacionId }, 'tablero.csv')}
          className="ml-auto flex items-center gap-1.5 border border-stone-300 hover:border-brand-500 hover:text-brand-700 text-sm px-3 py-1.5 rounded-lg transition disabled:opacity-50">
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {tablero && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-xs text-stone-500">Resultado global (promedio)</p>
            <p className="font-display text-3xl text-brand-700">{tablero.resultado_global}%</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-xs text-stone-500 mb-1">Semáforo de la delegación</p>
            <Semaforo valor={tablero.semaforo_global === 'sin_metas' ? null : tablero.semaforo_global} />
            <p className="text-xs text-stone-400 mt-1.5">Esperado al día: {tablero.meta_esperada_al_dia}%</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-xs text-stone-500">Actividades aprobadas</p>
            <p className="font-display text-3xl text-stone-900">{tablero.total_aprobadas}</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-xs text-stone-500">Agenda colectiva realizada</p>
            <p className={`font-display text-3xl ${tablero.agenda_cumple_umbral ? 'text-emerald-700' : 'text-brand-700'}`}>{ag.porcentaje_realizado}%</p>
            <p className="text-xs text-stone-400">Umbral {tablero.umbral_colectivo}% · {ag.vencidos} vencidos de {ag.total}</p>
          </div>
        </div>
      )}

      {tablero && datosGrafico.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl p-5 mb-6 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe8" />
              <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => [`${v}%`, 'Resultado ponderado']} />
              <ReferenceLine y={Number(tablero.meta_esperada_al_dia)} ifOverflow="extendDomain" stroke="#78716c" strokeDasharray="4 4" label={{ value: 'Esperado hoy', fontSize: 10, fill: '#78716c', position: 'insideTopRight' }} />
              <Bar dataKey="resultado" radius={[6, 6, 0, 0]}>
                {datosGrafico.map((d, idx) => <Cell key={idx} fill={COLOR_SEMAFORO[d.semaforo] || '#a8a29e'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {tablero && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-left text-stone-500">
                <th className="px-4 py-2.5 font-medium">Funcionario</th>
                <th className="px-4 py-2.5 font-medium">Cargo</th>
                <th className="px-4 py-2.5 font-medium">Resultado ponderado</th>
                <th className="px-4 py-2.5 font-medium">Semáforo</th>
                <th className="px-4 py-2.5 font-medium">Último registro</th>
                <th className="px-4 py-2.5 font-medium">Registros · prom./día</th>
                <th className="px-4 py-2.5 font-medium">Agenda</th>
              </tr>
            </thead>
            <tbody>
              {tablero.funcionarios.map((f) => {
                const r = f.actividad_reciente;
                return (
                  <tr key={f.funcionario_id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                    <td className="px-4 py-2.5">
                      <Link to={`/tablero-personal?funcionario=${f.funcionario_id}`} className="inline-flex items-center gap-0.5 hover:text-brand-700 hover:underline">
                        {f.funcionario} <ChevronRight size={13} />
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-stone-500">{f.cargo || '-'}</td>
                    <td className="px-4 py-2.5 font-medium">
                      {f.indicadores.length ? `${f.resultado_ponderado_total}%` : <span className="text-stone-400 font-normal">Sin metas</span>}
                      {f.indicadores.length > 0 && !f.ponderacion_valida && <span className="block text-xs text-amber-700 font-normal">Ponderación {f.ponderacion_total}%</span>}
                    </td>
                    <td className="px-4 py-2.5">{f.indicadores.length ? <Semaforo valor={f.semaforo} /> : '-'}</td>
                    <td className={`px-4 py-2.5 ${r.sin_actividad_reciente ? 'text-brand-700' : ''}`}>
                      {r.ultimo_registro || 'Nunca'}{r.dias_sin_registro != null && <span className="block text-xs text-stone-400">hace {r.dias_sin_registro} días</span>}
                    </td>
                    <td className="px-4 py-2.5">{r.cantidad_registros} · {r.promedio_diario}</td>
                    <td className="px-4 py-2.5">{f.compromisos.total ? `${f.compromisos.porcentaje_realizado}% (${f.compromisos.realizados}/${f.compromisos.total})` : '-'}</td>
                  </tr>
                );
              })}
              {tablero.funcionarios.length === 0 && (
                <tr><td colSpan="7" className="px-4 py-6 text-center text-stone-400">No hay funcionarios activos en esta delegación.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {cargos.length > 0 && (
        <>
          <h2 className="font-display text-lg text-stone-900 mb-3">Vista por cargos</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cargos.map((c) => (
              <div key={c.cargo} className="bg-white border border-stone-200 rounded-xl p-4">
                <div className="flex justify-between items-baseline">
                  <p className="font-medium text-stone-800">{c.cargo}</p>
                  <p className="font-display text-xl text-brand-700">{c.promedio_ponderado}%</p>
                </div>
                <p className="text-xs text-stone-500 mb-2">{c.funcionarios} funcionario(s) · {c.aprobadas} actividades aprobadas</p>
                <ul className="space-y-1">
                  {c.detalle.map((d) => (
                    <li key={d.funcionario_id} className="flex justify-between items-center text-sm">
                      <Link to={`/tablero-personal?funcionario=${d.funcionario_id}`} className="hover:text-brand-700 hover:underline">{d.funcionario}</Link>
                      <span className="flex items-center gap-2">{d.resultado_ponderado_total}% <Semaforo valor={d.semaforo === 'sin_metas' ? null : d.semaforo} /></span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
