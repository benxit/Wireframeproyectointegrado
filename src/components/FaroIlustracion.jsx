import { motion } from 'framer-motion';

/**
 * Ilustracion original (no copiada de ninguna imagen) inspirada en el Faro
 * Monumental de La Serena: franjas rojas y blancas, con un haz de luz que
 * barre lentamente. Es la unica pieza de movimiento ambiental de la app;
 * todo lo demas (tablas, formularios) se mueve solo cuando el usuario actua.
 */
export default function FaroIlustracion() {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Haz de luz giratorio */}
      <motion.div
        className="absolute left-1/2 top-[78px] w-[600px] h-[600px] origin-top"
        style={{
          background: 'conic-gradient(from -18deg, rgba(255,255,255,0.28), transparent 36deg)',
          marginLeft: '-300px',
        }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 7, ease: 'linear' }}
      />

      <svg width="220" height="340" viewBox="0 0 220 340" fill="none" className="relative drop-shadow-2xl">
        {/* base rocosa */}
        <path d="M20 330 Q110 300 200 330 L200 340 L20 340 Z" fill="#7c1818" />
        {/* cuerpo del faro */}
        <path d="M80 330 L70 140 Q110 125 150 140 L140 330 Z" fill="#ffffff" />
        <rect x="68" y="190" width="84" height="26" fill="#b8211f" />
        <rect x="68" y="250" width="84" height="26" fill="#b8211f" />
        {/* baranda */}
        <rect x="62" y="128" width="96" height="14" rx="2" fill="#5c1212" />
        {/* linterna */}
        <rect x="85" y="80" width="50" height="48" rx="4" fill="#fef2f2" stroke="#b8211f" strokeWidth="4" />
        <circle cx="110" cy="104" r="12" fill="#fde3e3" />
        {/* techo */}
        <path d="M80 80 L110 44 L140 80 Z" fill="#b8211f" />
        <rect x="104" y="30" width="12" height="18" fill="#7c1818" />
      </svg>
    </div>
  );
}
