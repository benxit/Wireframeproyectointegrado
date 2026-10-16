import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import api from '../api/client';
import Semaforo from '../components/Semaforo';
import { useAuth } from '../context/AuthContext';
import { fallo, mensajeError } from '../lib/alertas';
import { lista } from '../lib/descargas';

const COLOR_SEMAFORO = { verde: '#10b981', ambar: '#f59e0b', rojo: '#b8211f' };

function Tarjeta({ titulo, valor, detalle, destacado }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <p className="text-xs text-stone-500">{titulo}</p>
      <p className={`font-display text-2xl ${destacado ? 'text-brand-700' : 'text-stone-900'}`}>{valor}</p>
      {detalle && <p className="text-xs text-stone-400 mt-0.5">{detalle}</p>}
    </div>
  );
}

export default function TableroPersonal() {
  const { usuario, tieneRol } = useAuth();
  const [params] = useSearchParams();
  const [periodos, setPeriodos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [periodoId, setPeriodoId] = useState('');
  const [funcionarioId, setFuncionarioId] = useState(params.get('funcionario') || usuario?.id || '');
  const [tablero, setTablero] = useState(null);

  const puedeElegirOtro = tieneRol('Administrador', 'Coordinador', 'Delegado', 'Verificador', 'Consulta');
  const campoClase = 'px-3 py-1.5 rounded-lg border border-stone-300 text-sm';

  useEffect(() => {
    api.get('/periodos/').then(({ data }) => {
      const l = lista(data);
      setPeriodos(l);
      const abierto = l.find((p) => p.estado === 'abierto') || l[0];
      if (abierto) setPeriodoId(abierto.id);
    });
    if (puedeElegirOtro) api.get('/usuarios/').then(({ data }) => setUsuarios(lista(data))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!periodoId || !funcionarioId) return;
    api.get('/tablero/personal/', { params: { periodo: periodoId, funcionario: funcionarioId } })
      .then(({ data }) => setTablero(data))
      .catch((err) => { setTablero(null); fallo(mensajeError(err, 'No se pudo cargar el tablero.')); });
  }, [periodoId, funcionarioId]);

  const datosGrafico = (tablero?.indicadores || []).map((i) => ({
    nombre: i.item, cumplimiento: Number(i.porcentaje_computable), semaforo: i.semaforo,
  }));
  const r = tablero?.actividad_reciente;
  const ev = tablero?.evidencias;
  const comp = tablero?.compromisos;

  return (
    <div>
      <h1 className="font-display text-2xl text-stone-900 mb-4">{String(funcionarioId) === String(usuario?.id) ? 'Mi tablero' : `Tablero de ${tablero?.funcionario || '…'}`}</h1>

      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div>
          <label htmlFor="tp-per" className="text-xs text-stone-500 block mb-1">Periodo</label>
          <select id="tp-per" className={campoClase} value={periodoId} onChange={(e) => setPeriodoId(e.target.value)}>
            {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.estado === 'cerrado' ? ' (cerrado)' : ''}</option>)}
          </select>
        </div>
        {puedeElegirOtro && usuarios.length > 0 && (
          <div>
            <label htmlFor="tp-fun" className="text-xs text-stone-500 block mb-1">Funcionario</label>
            <select id="tp-fun" className={campoClase} value={funcionarioId} onChange={(e) => setFuncionarioId(e.target.value)}>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
          </div>
        )}
        {tablero && (
          <p className="text-xs text-stone-500 sm:ml-auto">
            Día {tablero.dias_transcurridos} de {tablero.dias_totales} · {tablero.fecha_inicio} a {tablero.fecha_termino} · calculado el {tablero.fecha_calculo}
          </p>
        )}
      </div>

      {tablero && (
        <>
          {!tablero.ponderacion_valida && tablero.indicadores.length > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm">
              <AlertTriangle size={17} className="mt-0.5 shrink-0" />
              Los ponderadores de este funcionario suman {tablero.ponderacion_total}% (deben sumar 100%). El resultado total no es comparable hasta corregir las metas.
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <p className="text-xs text-stone-500">Resultado ponderado total</p>
              <p className="font-display text-3xl text-brand-700">{tablero.resultado_ponderado_total}%</p>
              {Number(tablero.ajustes_total) !== 0 && (
                <p className="text-xs text-stone-500 mt-0.5">Ajustes {Number(tablero.ajustes_total) > 0 ? '+' : ''}{tablero.ajustes_total} → final <b>{tablero.resultado_final}%</b></p>
              )}
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <p className="text-xs text-stone-500 mb-1">Semáforo general</p>
              <Semaforo valor={tablero.semaforo === 'sin_metas' ? null : tablero.semaforo} />
              <p className="text-xs text-stone-400 mt-1.5">Esperado al día: {tablero.meta_esperada_al_dia}%</p>
            </div>
            <Tarjeta titulo="Último registro" valor={r.ultimo_registro || '—'}
              detalle={r.dias_sin_registro != null ? `${r.dias_sin_registro} días sin registrar · ${r.cantidad_registros} registros · ${r.promedio_diario}/día` : 'Sin registros en el periodo'}
              destacado={r.sin_actividad_reciente} />
            <Tarjeta titulo="Evidencias" valor={`${ev.aprobadas} aprobadas`}
              detalle={`${ev.pendientes} pendientes · ${ev.correccion} por corregir · ${ev.rechazadas} rechazadas · ${ev.sin_evidencia} sin archivo`} />
          </div>

          {comp.total > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6 text-sm flex flex-wrap gap-x-6 gap-y-1">
              <span className="text-stone-500">Compromisos del periodo:</span>
              <span><b>{comp.total}</b> asignados</span>
              <span><b>{comp.realizados}</b> realizados ({comp.porcentaje_realizado}%)</span>
              <span className={comp.vencidos ? 'text-brand-700' : ''}><b>{comp.vencidos}</b> vencidos</span>
              {comp.fuera_de_plazo > 0 && <span><b>{comp.fuera_de_plazo}</b> fuera de plazo</span>}
            </div>
          )}

          {datosGrafico.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl p-5 mb-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe8" />
                  <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v) => [`${v}%`, 'Cumplimiento']} />
                  <ReferenceLine y={Number(tablero.meta_esperada_al_dia)} ifOverflow="extendDomain" stroke="#78716c" strokeDasharray="4 4" label={{ value: 'Esperado hoy', fontSize: 10, fill: '#78716c', position: 'insideTopRight' }} />
                  <Bar dataKey="cumplimiento" radius={[6, 6, 0, 0]}>
                    {datosGrafico.map((d, idx) => (
                      <Cell key={idx} fill={COLOR_SEMAFORO[d.semaforo] || '#a8a29e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-left text-stone-500">
                  <th className="px-4 py-2.5 font-medium">Ítem</th><th className="px-4 py-2.5 font-medium">Meta</th>
                  <th className="px-4 py-2.5 font-medium">Avance</th><th className="px-4 py-2.5 font-medium">% Cumplimiento</th>
                  <th className="px-4 py-2.5 font-medium">Ponderador</th><th className="px-4 py-2.5 font-medium">Ponderado</th>
                  <th className="px-4 py-2.5 font-medium">Esperado hoy</th><th className="px-4 py-2.5 font-medium">Diferencia</th>
                  <th className="px-4 py-2.5 font-medium">Semáforo</th>
                </tr>
              </thead>
              <tbody>
                {tablero.indicadores.map((i) => (
                  <tr key={i.meta_id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                    <td className="px-4 py-2.5">{i.item}{i.cumplida && <span className="ml-1.5 text-xs text-emerald-700">✓ cumplida</span>}</td>
                    <td className="px-4 py-2.5">{i.valor_objetivo} {i.unidad}</td>
                    <td className="px-4 py-2.5">{i.avance_actual}</td>
                    <td className="px-4 py-2.5" title={`Tope computable: ${i.tope_cumplimiento}%`}>{i.porcentaje_cumplimiento}%</td>
                    <td className="px-4 py-2.5">{i.ponderador}%</td>
                    <td className="px-4 py-2.5 font-medium">{i.cumplimiento_ponderado}%</td>
                    <td className="px-4 py-2.5 text-stone-500">{i.meta_esperada_al_dia}%</td>
                    <td className={`px-4 py-2.5 ${Number(i.diferencia) < 0 ? 'text-brand-700' : 'text-emerald-700'}`}>{Number(i.diferencia) > 0 ? '+' : ''}{i.diferencia}</td>
                    <td className="px-4 py-2.5"><Semaforo valor={i.semaforo} /></td>
                  </tr>
                ))}
                {tablero.indicadores.length === 0 && (
                  <tr><td colSpan="9" className="px-4 py-6 text-center text-stone-400">Sin metas asignadas para este periodo.</td></tr>
                )}
              </tbody>
            </table>
            <p className="px-4 py-2.5 text-xs text-stone-400 border-t border-stone-100">
              Cumplimiento = avance aprobado ÷ meta × 100 (máx. computable según tope) · Ponderado = ponderador × cumplimiento ÷ 100 · Solo cuentan actividades con evidencia aprobada.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
