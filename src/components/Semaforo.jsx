import { Circle } from 'lucide-react';

const ESTILOS = {
  verde: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'text-emerald-500', label: 'Al día' },
  ambar: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'text-amber-500', label: 'En riesgo' },
  rojo: { bg: 'bg-brand-50', text: 'text-brand-700', dot: 'text-brand-500', label: 'Atrasado' },
};

export default function Semaforo({ valor }) {
  const e = ESTILOS[valor] || { bg: 'bg-stone-100', text: 'text-stone-500', dot: 'text-stone-400', label: valor || '-' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${e.bg} ${e.text}`}>
      <Circle size={8} className={e.dot} fill="currentColor" />
      {e.label}
    </span>
  );
}
