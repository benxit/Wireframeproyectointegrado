import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../api/client';
import CrudSimple from '../components/CrudSimple';
import { lista } from '../lib/descargas';

/** Panel RN-001: los ponderadores de cada funcionario deben sumar 100 % para cerrar el periodo. */
function PanelPonderacion({ periodos, refresco }) {
  const [periodoId, setPeriodoId] = useState('');
  const [filas, setFilas] = useState([]);

  useEffect(() => {
    const abierto = periodos.find((p) => p.estado === 'abierto') || periodos[0];
    if (abierto) setPeriodoId(String(abierto.id));
  }, [periodos]);

  useEffect(() => {
    if (!periodoId) return;
    api.get('/metas/ponderaciones/', { params: { periodo: periodoId } }).then(({ data }) => setFilas(data)).catch(() => setFilas([]));
  }, [periodoId, refresco]);

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 mb-6 max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-sm font-medium text-stone-700">Ponderación por funcionario (debe sumar 100 %)</p>
        <select className="px-3 py-1.5 rounded-lg border border-stone-300 text-sm" value={periodoId} onChange={(e) => setPeriodoId(e.target.value)} aria-label="Periodo">
          {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>
      {filas.length === 0 && <p className="text-sm text-stone-400">Aún no hay metas en este periodo.</p>}
      <ul className="space-y-1.5">
        {filas.map((f) => (
          <li key={f.funcionario_id} className="flex items-center justify-between text-sm">
            <span>{f.funcionario} <span className="text-stone-400">· {f.metas} meta(s)</span></span>
            <span className={`inline-flex items-center gap-1 ${f.valida ? 'text-emerald-700' : 'text-amber-700'}`}>
              {f.valida ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {f.ponderacion_total}%
              {!f.valida && <span className="text-xs">(falta {(100 - Number(f.ponderacion_total)).toFixed(2)}%)</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Metas() {
  const [datos, setDatos] = useState(null);
  const [refresco, setRefresco] = useState(0);
  const refrescar = useCallback(() => setRefresco((n) => n + 1), []);

  useEffect(() => {
    Promise.all([api.get('/items/'), api.get('/usuarios/'), api.get('/periodos/')])
      .then(([items, usuarios, periodos]) => setDatos({ items: lista(items.data), usuarios: lista(usuarios.data), periodos: lista(periodos.data) }));
  }, []);

  if (!datos) return <p>Cargando...</p>;

  const abiertos = datos.periodos.filter((p) => p.estado === 'abierto');
  // Se miden funcionarios activos con cargo (RF-003: el cargo define los ítems medibles).
  const funcionarios = datos.usuarios.filter((u) => u.estado === 'activo' && u.cargo);
  const nombre = (u) => `${u.first_name} ${u.last_name}`.trim() || u.username;
  const enAbierto = (item) => item.periodo_estado !== 'cerrado';

  return (
    <div>
      <CrudSimple
        titulo="Metas por funcionario y periodo"
        subtitulo="Cada funcionario recibe metas de los ítems de su cargo. Un periodo cerrado ya no admite cambios."
        endpoint="metas"
        alCambiar={refrescar}
        editable={enAbierto}
        eliminable={enAbierto}
        columnas={[
          { key: 'item_nombre', label: 'Ítem' },
          { key: 'funcionario_nombre', label: 'Funcionario' },
          { key: 'periodo_nombre', label: 'Periodo' },
          { key: 'valor_objetivo', label: 'Meta' },
          { key: 'ponderador', label: 'Ponderador %' },
          { key: 'tope_cumplimiento', label: 'Tope %' },
        ]}
        campos={[
          { name: 'item', label: 'Ítem', type: 'select', required: true,
            options: datos.items.filter((i) => i.vigente).map((i) => ({ value: i.id, label: `${i.nombre} (${i.cargo_nombre})` })) },
          { name: 'funcionario', label: 'Funcionario', type: 'select', required: true,
            options: funcionarios.map((u) => ({ value: u.id, label: `${nombre(u)} (${u.cargo_nombre})` })) },
          { name: 'periodo', label: 'Periodo', type: 'select', required: true,
            options: abiertos.map((p) => ({ value: p.id, label: p.nombre })) },
          { name: 'valor_objetivo', label: 'Valor objetivo (meta, mayor que 0)', type: 'number', required: true, min: '0.01', step: '0.01' },
          { name: 'ponderador', label: 'Ponderador (%)', type: 'number', required: true, min: '0', max: '100', step: '0.01' },
          { name: 'tope_cumplimiento', label: 'Tope de cumplimiento computable (%)', type: 'number', min: '100', max: '500' },
        ]}
      />

      <PanelPonderacion periodos={datos.periodos} refresco={refresco} />

      <div className="h-px bg-stone-200 my-8" />

      <CrudSimple
        titulo="Ajustes: felicitaciones y reclamos"
        subtitulo="Puntos porcentuales que suman (felicitación) o restan (reclamo) al resultado final del funcionario. Indica siempre el motivo."
        endpoint="ajustes"
        editable={enAbierto}
        eliminable={enAbierto}
        columnas={[
          { key: 'funcionario_nombre', label: 'Funcionario' },
          { key: 'periodo_nombre', label: 'Periodo' },
          { key: 'tipo_nombre', label: 'Tipo' },
          { key: 'valor', label: 'Valor', render: (a) => `${Number(a.valor) > 0 ? '+' : ''}${a.valor}` },
          { key: 'motivo', label: 'Motivo' },
          { key: 'responsable_nombre', label: 'Registrado por' },
        ]}
        campos={[
          { name: 'funcionario', label: 'Funcionario', type: 'select', required: true,
            options: funcionarios.map((u) => ({ value: u.id, label: nombre(u) })) },
          { name: 'periodo', label: 'Periodo', type: 'select', required: true, options: abiertos.map((p) => ({ value: p.id, label: p.nombre })) },
          { name: 'tipo', label: 'Tipo', type: 'select', required: true,
            options: [{ value: 'felicitacion', label: 'Felicitación (+)' }, { value: 'reclamo', label: 'Reclamo (−)' }, { value: 'otro', label: 'Otro' }] },
          { name: 'valor', label: 'Valor (puntos %, ej: 5 o -10)', type: 'number', required: true, min: '-100', max: '100', step: '0.01' },
          { name: 'motivo', label: 'Motivo', required: true, ancho: 'full' },
        ]}
      />
    </div>
  );
}
