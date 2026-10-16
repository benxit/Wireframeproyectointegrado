import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import Splash from '../components/Splash';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me/');
      setUsuario(data);
      return data;
    } catch {
      setUsuario(null);
      return null;
    }
  }, []);

  useEffect(() => {
    // Limpieza de versiones anteriores que guardaban tokens en localStorage (inseguro).
    ['sgr_access', 'sgr_refresh', 'sgr_usuario'].forEach((k) => localStorage.removeItem(k));
    recargar().finally(() => setCargando(false));
    const expirada = () => setUsuario(null);
    const reconectado = () => recargar();
    window.addEventListener('sgr:sesion-expirada', expirada);
    window.addEventListener('sgr:reconectado', reconectado);
    return () => {
      window.removeEventListener('sgr:sesion-expirada', expirada);
      window.removeEventListener('sgr:reconectado', reconectado);
    };
  }, [recargar]);

  /** Devuelve { mfa: true, ticket } si la cuenta pide el segundo paso; si no, deja la sesion iniciada. */
  async function login(username, password) {
    const { data } = await api.post('/auth/login/', { username, password });
    if (data.mfa_requerido) return { mfa: true, ticket: data.ticket };
    setUsuario(data.usuario);
    return { mfa: false };
  }

  async function loginMfa(ticket, codigo) {
    const { data } = await api.post('/auth/login/mfa/', { ticket, codigo });
    setUsuario(data.usuario);
  }

  async function logout() {
    try { await api.post('/auth/logout/'); } catch { /* la sesion local se cierra igual */ }
    setUsuario(null);
  }

  const tieneRol = (...roles) => !!usuario && usuario.roles.some((r) => roles.includes(r));

  if (cargando) return <Splash />;
  return (
    <AuthContext.Provider value={{ usuario, login, loginMfa, logout, tieneRol, recargar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
