import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const leer = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() => leer('sgr_tema', 'claro'));
  const [compacto, setCompacto] = useState(() => leer('sgr_menu_compacto', '0') === '1');
  const [calmo, setCalmo] = useState(() => leer('sgr_calmo', '0') === '1');

  useEffect(() => {
    document.documentElement.dataset.theme = tema === 'oscuro' ? 'dark' : 'light';
    document.documentElement.classList.toggle('sin-anim', calmo);
  }, [tema, calmo]);

  const alternarTema = useCallback(() => {
    const h = document.documentElement;
    h.classList.add('cambiando-tema');        // transicion suave de colores solo durante el cambio
    setTimeout(() => h.classList.remove('cambiando-tema'), 700);
    setTema((t) => { const n = t === 'oscuro' ? 'claro' : 'oscuro'; guardar('sgr_tema', n); return n; });
  }, []);
  const poner = (setter, clave) => (v) => setter((prev) => { const n = typeof v === 'function' ? v(prev) : v; guardar(clave, n ? '1' : '0'); return n; });

  return (
    <ThemeContext.Provider value={{ tema, oscuro: tema === 'oscuro', alternarTema, compacto, setCompacto: poner(setCompacto, 'sgr_menu_compacto'), calmo, setCalmo: poner(setCalmo, 'sgr_calmo') }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTema = () => useContext(ThemeContext);
