import { motion } from 'framer-motion';
import { useTema } from '../context/ThemeContext';

/** Interruptor día/noche: cielo con nubes y sol -> noche con estrellas y luna. */
export default function TemaSwitch({ grande = false }) {
  const { oscuro, alternarTema } = useTema();
  return (
    <button type="button" className={`tema-sw ${oscuro ? 'noche' : 'dia'} ${grande ? 'grande' : ''}`} onClick={alternarTema}
      role="switch" aria-checked={oscuro} aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} title={oscuro ? 'Modo noche' : 'Modo día'}>
      <span className="ts-cielo ts-dia" />
      <span className="ts-cielo ts-noche" />
      <span className="ts-estrellas">{[[16, 22, 2], [34, 10, 1.5], [46, 30, 1.2], [26, 38, 1.4], [58, 16, 1.6], [10, 40, 1]].map(([x, y, r], i) => (
        <i key={i} style={{ left: `${x}%`, top: `${y}%`, width: r * 2, height: r * 2, animationDelay: `${i * 0.35}s` }} />))}</span>
      <span className="ts-sol" />
      <span className="ts-luna" />
      <span className="ts-nubes"><i /><i /><i /><i /></span>
      <motion.span className="ts-perilla" layout transition={{ type: 'spring', stiffness: 380, damping: 26 }} style={{ [oscuro ? 'right' : 'left']: 4 }} />
    </button>
  );
}
