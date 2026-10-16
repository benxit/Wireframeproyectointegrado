import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RutaPrivada({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

export function RutaConRol({ roles, children }) {
  const { tieneRol } = useAuth();
  if (!tieneRol(...roles)) {
    return (
      <div className="bg-white border border-brand-200 rounded-xl p-5 text-brand-700 text-sm max-w-md">
        No tienes permisos para ver esta sección.
      </div>
    );
  }
  return children;
}
