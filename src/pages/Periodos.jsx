import { Lock, LockOpen } from 'lucide-react';
import CrudSimple from '../components/CrudSimple';
import api from '../api/client';
import { confirmar, fallo, mensajeError, ok, pedirTexto } from '../lib/alertas';
import { useAuth } from '../context/AuthContext';

const ESTADO = {
  abierto: 'bg-emerald-50 text-emerald-700',
  cerrado: 'bg-stone-100 text-stone-600',
};

export default function Periodos() {
  const { tieneRol } = useAuth();
  const esAdmin = tieneRol('Administrador');

  async function cerrar(p, recargar) {
    const si = await confirmar({
      titulo: `¿Cerrar "${p.nombre}"?`,
      texto: 'Sus metas, actividades y resultados quedarán congelados. Solo un administrador podrá reabrirlo, con motivo y auditoría.',
      confirmar: 'Sí, cerrar periodo', icono: 'warning', peligro: true,
    });
    if (!si) return;
    try {
      await api.post(`/periodos/${p.id}/cerrar/`);
      ok('Periodo cerrado');
      recargar();
    } catch (err) {
      fallo(mensajeError(err, 'No se pudo cerrar el periodo.'));
    }
  }

  async function reabrir(p, recargar) {
    const motivo = await pedirTexto({
      titulo: `Reabrir "${p.nombre}"`, texto: 'La reapertura queda registrada en la auditoría con este motivo.',
      placeholder: 'Ej: corrección de actividades validadas por error…', confirmar: 'Reabrir',
    });
    if (motivo === null) return;
    try {
      await api.post(`/periodos/${p.id}/reabrir/`, { motivo });
      ok('Periodo reabierto', 'Quedó registrado en la auditoría.');
      recargar();
    } catch (err) {
      fallo(mensajeError(err, 'No se pudo reabrir el periodo.'));
    }
  }

  return (
    <CrudSimple
      titulo="Periodos de medición"
      subtitulo="Los días computables se calculan a partir de las fechas (se cuentan el día de inicio y el de término)."
      endpoint="periodos"
      editable={(p) => p.estado === 'abierto'}
      eliminable={(p) => p.estado === 'abierto'}
      acciones={(p, recargar) => (p.estado === 'abierto' ? (
        <button onClick={() => cerrar(p, recargar)} className="text-stone-400 hover:text-brand-600 transition" title="Cerrar periodo" aria-label="Cerrar periodo"><Lock size={15} /></button>
      ) : esAdmin && (
        <button onClick={() => reabrir(p, recargar)} className="text-stone-400 hover:text-brand-600 transition" title="Reabrir periodo" aria-label="Reabrir periodo"><LockOpen size={15} /></button>
      ))}
      columnas={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'fecha_inicio', label: 'Inicio' },
        { key: 'fecha_termino', label: 'Término' },
        { key: 'dias_computables', label: 'Días' },
        { key: 'umbral_colectivo', label: 'Umbral agenda %' },
        { key: 'umbral_ambar', label: 'Umbral ámbar %' },
        { key: 'estado', label: 'Estado', render: (p) => <span className={`px-2 py-0.5 rounded-full text-xs ${ESTADO[p.estado]}`}>{p.estado === 'abierto' ? 'Abierto' : 'Cerrado'}</span> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre (ej: Trimestre 4 - 2026)', required: true },
        { name: 'fecha_inicio', label: 'Fecha inicio', type: 'date', required: true },
        { name: 'fecha_termino', label: 'Fecha término', type: 'date', required: true },
        { name: 'umbral_colectivo', label: 'Umbral colectivo de la agenda (%)', type: 'number', min: '0', max: '100' },
        { name: 'umbral_ambar', label: 'Umbral ámbar del semáforo (% de lo esperado)', type: 'number', min: '1', max: '99' },
      ]}
    />
  );
}
