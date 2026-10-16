import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, CheckCheck, ChevronRight } from 'lucide-react';
import api from '../api/client';
import { fallo, mensajeError, ok } from '../lib/alertas';

const TIPOS = {
  compromiso_vencido: 'Compromiso vencido',
  compromiso_por_vencer: 'Compromiso por vencer',
  evidencia_pendiente: 'Evidencia sin revisar',
  evidencia_requiere_accion: 'Actividad por corregir',
  sin_registros: 'Sin registros recientes',
  avance_bajo_umbral: 'Avance bajo el umbral',
};

export default function Alertas() {
  const [alertas, setAlertas] = useState(null);
  const [verRevisadas, setVerRevisadas] = useState(false);

  const cargar = () => api.get('/alertas/').then(({ data }) => setAlertas(data)).catch((err) => fallo(mensajeError(err, 'No se pudieron cargar las alertas.')));
  useEffect(() => { cargar(); }, []);

  async function revisar(clave) {
    try {
      await api.post('/alertas/', { clave });
      ok('Alerta marcada como revisada', 'El evento original se mantiene en el sistema.');
      cargar();
      window.dispatchEvent(new CustomEvent('sgr:alertas'));
    } catch (err) {
      fallo(mensajeError(err, 'No se pudo marcar la alerta.'));
    }
  }

  const visibles = (alertas || []).filter((a) => verRevisadas || !a.revisada);

  return (
    <div>
      <h1 className="font-display text-2xl text-stone-900 mb-1 flex items-center gap-2"><BellRing size={22} className="text-brand-600" /> Alertas operativas</h1>
      <p className="text-sm text-stone-500 mb-4">Vencimientos, evidencias pendientes, ausencia de registros y avance bajo el umbral, dentro de tu ámbito.</p>

      <label className="flex items-center gap-2 text-sm text-stone-600 mb-4">
        <input type="checkbox" className="accent-brand-600" checked={verRevisadas} onChange={(e) => setVerRevisadas(e.target.checked)} />
        Mostrar también las revisadas
      </label>

      {alertas === null && <p className="text-sm text-stone-400">Cargando...</p>}
      {alertas && visibles.length === 0 && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 text-center text-stone-500 text-sm">Estás al día: no hay alertas pendientes.</div>
      )}

      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {visibles.map((a) => (
            <motion.li key={a.clave} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`bg-white border rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 ${a.revisada ? 'border-stone-200 opacity-60' : a.nivel === 'alta' ? 'border-brand-200' : 'border-amber-200'}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${a.nivel === 'alta' ? 'bg-brand-600' : 'bg-amber-500'}`} />
              <div className="flex-1 min-w-[14rem]">
                <p className="text-xs text-stone-500">{TIPOS[a.tipo] || a.tipo} · {a.fecha} · Responsable: {a.responsable}</p>
                <p className="text-sm text-stone-800">{a.motivo}</p>
              </div>
              <Link to={a.enlace} className="inline-flex items-center gap-0.5 text-sm text-brand-700 hover:underline">Ver <ChevronRight size={14} /></Link>
              {!a.revisada && (
                <button onClick={() => revisar(a.clave)} className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
                  <CheckCheck size={15} /> Revisada
                </button>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
