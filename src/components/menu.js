import {
  LayoutDashboard, Building2, Briefcase, Users, CalendarRange, Target,
  ClipboardList, CalendarClock, HeartHandshake, Gauge, Building, ShieldCheck, Settings, BookMarked, BellRing,
} from 'lucide-react';

const ADMIN_COORD = ['Administrador', 'Coordinador'];
const OPERATIVOS = ['Administrador', 'Coordinador', 'Delegado', 'Funcionario', 'Verificador'];

// endpoint: de dónde sale el contador que se muestra en la tarjeta del Inicio (opcional)
export const MENU = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, roles: null },
  { to: '/delegaciones', grupo: 'gestion', label: 'Delegaciones', icon: Building2, endpoint: 'delegaciones', roles: ADMIN_COORD },
  { to: '/cargos', grupo: 'gestion', label: 'Cargos e ítems', icon: Briefcase, roles: ADMIN_COORD },
  { to: '/catalogo', grupo: 'gestion', label: 'Catálogo', icon: BookMarked, roles: ['Administrador'] },
  { to: '/usuarios', grupo: 'gestion', label: 'Usuarios', icon: Users, roles: ['Administrador'] },
  { to: '/periodos', grupo: 'seguimiento', label: 'Períodos', icon: CalendarRange, roles: ADMIN_COORD },
  { to: '/metas', grupo: 'seguimiento', label: 'Metas', icon: Target, roles: ADMIN_COORD },
  { to: '/actividades', grupo: 'seguimiento', label: 'Actividades', icon: ClipboardList, endpoint: 'actividades', roles: OPERATIVOS },
  { to: '/agenda', grupo: 'seguimiento', label: 'Agenda colectiva', icon: CalendarClock, endpoint: 'compromisos', roles: [...OPERATIVOS, 'Consulta'] },
  { to: '/atencion-social', grupo: 'seguimiento', label: 'Atención social', icon: HeartHandshake, endpoint: 'casos-sociales', roles: ['Administrador', 'Coordinador', 'Delegado', 'Funcionario'] },
  { to: '/tablero-personal', grupo: 'analisis', label: 'Mi tablero', icon: Gauge, roles: OPERATIVOS },
  { to: '/tablero-delegacion', grupo: 'analisis', label: 'Tablero delegación', icon: Building, roles: [...ADMIN_COORD, 'Delegado', 'Consulta'] },
  { to: '/alertas', grupo: 'analisis', label: 'Alertas', icon: BellRing, roles: null },
  { to: '/auditoria', grupo: 'analisis', label: 'Auditoría', icon: ShieldCheck, roles: ['Administrador'] },
  { to: '/configuracion', grupo: 'cuenta', label: 'Configuración', icon: Settings, roles: null },
];

export const GRUPOS = { gestion: 'GESTIÓN', seguimiento: 'SEGUIMIENTO', analisis: 'ANÁLISIS', cuenta: 'CUENTA' };
