import { useEffect, useState } from 'react';
import { animate } from 'framer-motion';

/** Número que "sube" hasta su valor con una curva suave. */
export default function Contador({ valor, sufijo = '', duracion = 1.6 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const c = animate(0, Number(valor) || 0, { duration: duracion, ease: [0.22, 1, 0.36, 1], onUpdate: setN });
    return () => c.stop();
  }, [valor, duracion]);
  return <>{Math.round(n).toLocaleString('es-CL')}{sufijo}</>;
}
