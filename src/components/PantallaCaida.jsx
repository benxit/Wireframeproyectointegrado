import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BASE } from '../api/client';
import { ok } from '../lib/alertas';
import { PanelCaida } from './Escena404';

/** Se muestra cuando la API no responde; consulta /auth/estado/ cada 5 s y se oculta sola al volver. */
export default function PantallaCaida() {
  const [caido, setCaido] = useState(false);
  const [probando, setProbando] = useState(false);
  const activo = useRef(false);

  const probar = useCallback(async () => {
    setProbando(true);
    try {
      const r = await fetch(`${BASE}/auth/estado/`, { cache: 'no-store', credentials: 'include' });
      if (r.ok) {
        activo.current = false;
        setCaido(false);
        ok('Conexión restablecida', 'El sistema volvió a estar disponible.');
        window.dispatchEvent(new CustomEvent('sgr:reconectado'));
      }
    } catch { /* sigue caido */ } finally { setProbando(false); }
  }, []);

  useEffect(() => {
    const alCaer = () => { activo.current = true; setCaido(true); };
    window.addEventListener('sgr:caida', alCaer);
    return () => window.removeEventListener('sgr:caida', alCaer);
  }, []);
  useEffect(() => {
    if (!caido) return undefined;
    const t = setInterval(probar, 5000);
    return () => clearInterval(t);
  }, [caido, probar]);

  return (
    <AnimatePresence>
      {caido && (
        <motion.div className="caida-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="alert">
          <PanelCaida reintentando={probando} onReintentar={probar} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
