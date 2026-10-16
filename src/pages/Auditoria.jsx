import { useEffect, useState } from 'react';
import { ShieldCheck, Filter } from 'lucide-react';
import api from '../api/client';
import { fallo, mensajeError } from '../lib/alertas';
import { lista } from '../lib/descargas';

const ENTIDADES = ['Actividad', 'Evidencia', 'Validacion', 'MetaIndicador', 'Periodo', 'Ajuste', 'Compromiso', 'Delegacion',
  'Cargo', 'Item', 'CatalogoServicio', 'CasoSocial', 'GestionSocial', 'Usuario', 'Informe'];

const parsear = (t) => { try { return t ? JSON.parse(t) : null; } catch { return null; } };

/** Muestra qué cambió: "campo: antes → después". Si el registro no es un JSON de cambios, muestra el texto. */
function Detalle({ r }) {
  const antes = parsear(r.valor_anterior);
  const despues = parsear(r.valor_nuevo);
  if (!antes && !despues) return <span>{r.valor_nuevo || r.valor_anterior || '-'}</span>;
  const campos = Object.keys({ ...(antes || {}), ...(despues || {}) });
  return (
    <ul className="space-y-0.5">
      {campos.slice(0, 6).map((k) => (
        <li key={k} className="text-xs">
          <span className="text-stone-400">{k}:</span>{' '}
          {antes && <span className="line-through text-stone-400">{String(antes[k] ?? '') || '∅'}</span>}
          {antes && despues && ' → '}
          {despues && <span className="text-stone-700">{String(despues[k] ?? '') || '∅'}</span>}
        </li>
      ))}
      {campos.length > 6 && <li className="text-xs text-stone-400">… y {campos.length - 6} campo(s) más</li>}
    </ul>
  );
}

export default function Auditoria() {
  const [registros, setRegistros] = useState([]);
  const [filtros, setFiltros] = useState({});
  const [cargando, setCargando] = useState(true);

  async function cargar(f = filtros) {
    setCargando(true);
    try {
      const limpio = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
      setRegistros(lista((await api.get('/auditoria/', { params: limpio })).data));
    } catch (err) {
      fallo(mensajeError(err, 'No se pudo cargar la auditoría.'));
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { cargar(); }, []);

  const onFiltro = (k, v) => setFiltros((f) => ({ ...f, [k]: v }));
  const filtroClase = 'px-3 py-1.5 rounded-lg border border-stone-300 text-sm';

  return (
    <div>
      <h1 className="font-display text-2xl text-stone-900 mb-1 flex items-center gap-2">
        <ShieldCheck size={22} className="text-brand-600" /> Auditoría de cambios
      </h1>
      <p className="text-sm text-stone-500 mb-4">Quién cambió qué dato y cuándo. El historial es de solo lectura: no se puede modificar ni eliminar.</p>

      <form onSubmit={(e) => { e.preventDefault(); cargar(); }} className="bg-white border border-stone-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end">
        <label className="block"><span className="text-xs text-stone-500 block mb-1">Entidad</span>
          <select className={filtroClase} value={filtros.entidad || ''} onChange={(e) => onFiltro('entidad', e.target.value)}>
            <option value="">Todas</option>{ENTIDADES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select></label>
        <label className="block"><span className="text-xs text-stone-500 block mb-1">Evento</span>
          <input className={`${filtroClase} w-40`} placeholder="modificacion, login…" value={filtros.evento || ''} onChange={(e) => onFiltro('evento', e.target.value.trim())} /></label>
        <label className="block"><span className="text-xs text-stone-500 block mb-1">ID del registro</span>
          <input className={`${filtroClase} w-24`} value={filtros.identificador || ''} onChange={(e) => onFiltro('identificador', e.target.value.trim())} /></label>
        <label className="block"><span className="text-xs text-stone-500 block mb-1">Desde</span>
          <input type="date" className={filtroClase} value={filtros.desde || ''} onChange={(e) => onFiltro('desde', e.target.value)} /></label>
        <label className="block"><span className="text-xs text-stone-500 block mb-1">Hasta</span>
          <input type="date" className={filtroClase} value={filtros.hasta || ''} onChange={(e) => onFiltro('hasta', e.target.value)} /></label>
        <label className="block"><span className="text-xs text-stone-500 block mb-1">Resultado</span>
          <select className={filtroClase} value={filtros.exito || ''} onChange={(e) => onFiltro('exito', e.target.value)}>
            <option value="">Todos</option><option value="true">Exitoso</option><option value="false">Denegado / fallido</option>
          </select></label>
        <button type="submit" className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-700 text-white text-sm px-3 py-1.5 rounded-lg transition"><Filter size={14} /> Filtrar</button>
        <button type="button" onClick={() => { setFiltros({}); cargar({}); }} className="text-sm text-stone-500 hover:text-stone-700 px-2 py-1.5">Limpiar</button>
      </form>

      <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-left text-stone-500">
              <th className="px-4 py-2.5 font-medium">Fecha</th><th className="px-4 py-2.5 font-medium">Usuario</th>
              <th className="px-4 py-2.5 font-medium">Evento</th><th className="px-4 py-2.5 font-medium">Entidad</th>
              <th className="px-4 py-2.5 font-medium">ID</th><th className="px-4 py-2.5 font-medium">Cambio</th>
              <th className="px-4 py-2.5 font-medium">Origen</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => (
              <tr key={r.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 align-top">
                <td className="px-4 py-2.5 text-stone-500 whitespace-nowrap">{r.fecha}</td>
                <td className="px-4 py-2.5">{r.usuario_nombre || '-'}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.exito ? 'bg-stone-100 text-stone-600' : 'bg-brand-50 text-brand-700'}`}>{r.evento}</span>
                </td>
                <td className="px-4 py-2.5">{r.entidad}</td>
                <td className="px-4 py-2.5 text-stone-500">{r.identificador}</td>
                <td className="px-4 py-2.5 text-stone-600 max-w-md"><Detalle r={r} /></td>
                <td className="px-4 py-2.5 text-xs text-stone-400">{r.ip || '-'}</td>
              </tr>
            ))}
            {!cargando && registros.length === 0 && <tr><td colSpan="7" className="px-4 py-6 text-center text-stone-400">Sin eventos con estos filtros.</td></tr>}
          </tbody>
        </table>
        {cargando && <p className="px-4 py-3 text-sm text-stone-400">Cargando...</p>}
      </div>
    </div>
  );
}
