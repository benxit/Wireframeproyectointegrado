import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PantallaCaida from './components/PantallaCaida';
import Pagina404 from './components/Escena404';
import Configuracion from './pages/Configuracion';
import Restablecer from './pages/Restablecer';
import { RutaPrivada, RutaConRol } from './components/RutaProtegida';
import Layout from './components/Layout';

import Login from './pages/Login';
import Home from './pages/Home';
import Delegaciones from './pages/Delegaciones';
import Cargos from './pages/Cargos';
import Usuarios from './pages/Usuarios';
import Periodos from './pages/Periodos';
import Metas from './pages/Metas';
import Actividades from './pages/Actividades';
import Agenda from './pages/Agenda';
import AtencionSocial from './pages/AtencionSocial';
import TableroPersonal from './pages/TableroPersonal';
import TableroDelegacion from './pages/TableroDelegacion';
import Auditoria from './pages/Auditoria';
import Catalogo from './pages/Catalogo';
import Alertas from './pages/Alertas';

const ADMIN_COORD = ['Administrador', 'Coordinador'];
const OPERATIVOS = ['Administrador', 'Coordinador', 'Delegado', 'Funcionario', 'Verificador'];
// Atención social: datos sensibles de personas; ni Verificador ni Consulta (igual que la API).
const AREA_SOCIAL = ['Administrador', 'Coordinador', 'Delegado', 'Funcionario'];

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <PantallaCaida />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/restablecer" element={<Restablecer />} />
          <Route path="/" element={<RutaPrivada><Layout /></RutaPrivada>}>
            <Route index element={<Home />} />
            <Route path="delegaciones" element={<RutaConRol roles={ADMIN_COORD}><Delegaciones /></RutaConRol>} />
            <Route path="cargos" element={<RutaConRol roles={ADMIN_COORD}><Cargos /></RutaConRol>} />
            <Route path="catalogo" element={<RutaConRol roles={['Administrador']}><Catalogo /></RutaConRol>} />
            <Route path="usuarios" element={<RutaConRol roles={['Administrador']}><Usuarios /></RutaConRol>} />
            <Route path="periodos" element={<RutaConRol roles={ADMIN_COORD}><Periodos /></RutaConRol>} />
            <Route path="metas" element={<RutaConRol roles={ADMIN_COORD}><Metas /></RutaConRol>} />
            <Route path="actividades" element={<RutaConRol roles={OPERATIVOS}><Actividades /></RutaConRol>} />
            <Route path="agenda" element={<RutaConRol roles={[...OPERATIVOS, 'Consulta']}><Agenda /></RutaConRol>} />
            <Route path="atencion-social" element={<RutaConRol roles={AREA_SOCIAL}><AtencionSocial /></RutaConRol>} />
            <Route path="tablero-personal" element={<RutaConRol roles={[...OPERATIVOS, 'Consulta']}><TableroPersonal /></RutaConRol>} />
            <Route path="tablero-delegacion" element={<RutaConRol roles={[...ADMIN_COORD, 'Delegado', 'Consulta']}><TableroDelegacion /></RutaConRol>} />
            <Route path="alertas" element={<Alertas />} />
            <Route path="auditoria" element={<RutaConRol roles={['Administrador']}><Auditoria /></RutaConRol>} />
            <Route path="configuracion" element={<Configuracion />} />
            <Route path="*" element={<Pagina404 />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
