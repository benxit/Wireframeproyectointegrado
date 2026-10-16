import { useEffect, useState } from 'react';
import api from '../api/client';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const ESTADO_AGENDA = { ingresado: 'Ingresado', pendiente: 'Pendiente', en_proceso: 'En proceso', realizado: 'Realizado' };
const lista = (d) => (Array.isArray(d) ? d : d?.results ?? []);
const iso = (d) => d.toISOString().slice(0, 10);
export const fmtFecha = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });

/** Datos de ejemplo (para ver el dashboard "lleno"): se activan con el interruptor del banner. */
export const DEMO = {
  demo: true,
  kpis: [
    { id: 'deleg', label: 'Delegaciones', valor: 6, sub: 'territoriales' },
    { id: 'func', label: 'Funcionarios', valor: 42, sub: 'vs. mes anterior', delta: { txt: '+3', up: true } },
    { id: 'act', label: 'Actividades', valor: 1248, sub: 'vs. mes anterior', delta: { txt: '+12%', up: true } },
    { id: 'cump', label: 'Cumplimiento', valor: 87, sufijo: '%', sub: 'vs. mes anterior', delta: { txt: '+5%', up: true } },
  ],
  cumplimiento: 87,
  delegaciones: [
    // Las 6 delegaciones territoriales de La Serena (documento de contexto institucional).
    { id: 1, nombre: 'Centro', pct: 96 }, { id: 2, nombre: 'Las Compañías', pct: 87 }, { id: 3, nombre: 'La Antena', pct: 82 },
    { id: 4, nombre: 'Rural', pct: 78 }, { id: 5, nombre: 'Avenida del Mar', pct: 68 }, { id: 6, nombre: 'La Pampa', pct: 58 },
  ],
  serie: [52, 58, 56, 64, 66, 70, 78, 84].map((a, i) => ({ mes: MESES[i], actual: a, meta: [50, 55, 60, 65, 70, 75, 80, 85][i] })),
  ultimos: [
    { t: 'Atención vecinal', s: 'Delegación Centro', f: '23 ago. 2026 · 09:45' },
    { t: 'Reunión comunitaria', s: 'Delegación Las Compañías', f: '22 ago. 2026 · 16:20' },
    { t: 'Visita territorial', s: 'Delegación Rural', f: '21 ago. 2026 · 11:03' },
    { t: 'Informe de gestión', s: 'Delegación La Antena', f: '20 ago. 2026 · 15:47' },
  ],
  agenda: [
    { hora: '09:00', t: 'Reunión equipo', s: 'Delegación Centro', estado: 'Reunión' },
    { hora: '11:30', t: 'Visita territorial', s: 'Delegación Rural', estado: 'Terreno' },
    { hora: '14:00', t: 'Atención vecinal', s: 'Delegación Las Compañías', estado: 'Atención' },
    { hora: '16:30', t: 'Reunión de coordinación', s: 'Municipalidad', estado: 'Interna' },
  ],
  agendaHoy: true,
  periodo: { nombre: 'Trimestre 3', inicio: '2026-07-01', fin: '2026-09-30' },
  resumen: [
    { l: 'Total de ingresos', v: 1248, d: '+12%', up: true }, { l: 'Actividades realizadas', v: 892, d: '+15%', up: true },
    { l: 'Actividades pendientes', v: 356, d: '-8%', up: false }, { l: 'Promedio diario', v: 41, d: '+6%', up: true },
  ],
};

export const VACIO = {
  demo: false, cargando: true, cumplimiento: 0, delegaciones: [], serie: [], ultimos: [], agenda: [], agendaHoy: false, periodo: null,
  kpis: ['Delegaciones', 'Funcionarios', 'Actividades', 'Cumplimiento'].map((label, i) => ({ id: ['deleg', 'func', 'act', 'cump'][i], label, valor: 0, sufijo: i === 3 ? '%' : '' })),
  resumen: ['Total de ingresos', 'Actividades realizadas', 'Actividades pendientes', 'Promedio diario'].map((l) => ({ l, v: 0 })),
};

/** Carga todo desde la API real. Lo que el rol no puede consultar simplemente queda vacío. */
export function useDashboard() {
  const [datos, setDatos] = useState(VACIO);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const get = (u) => api.get(u).then((r) => lista(r.data)).catch(() => null);
      const [periodos, delegaciones, actividades, compromisos, usuarios] = await Promise.all(
        ['/periodos/', '/delegaciones/', '/actividades/', '/compromisos/', '/usuarios/'].map(get),
      );
      const periodo = (periodos || []).find((p) => p.estado === 'abierto') || (periodos || [])[0] || null;

      let deleg = [];
      if (periodo && delegaciones?.length) {
        deleg = await Promise.all(delegaciones.map(async (d) => {
          try {
            const { data } = await api.get('/tablero/delegacion/', { params: { delegacion: d.id, periodo: periodo.id } });
            const f = data.funcionarios || [];
            const prom = f.length ? f.reduce((a, x) => a + Number(x.resultado_ponderado_total || 0), 0) / f.length : 0;
            return { id: d.id, nombre: d.nombre, pct: Math.round(Math.min(prom, 100)), n: f.length };
          } catch { return { id: d.id, nombre: d.nombre, pct: 0, n: 0 }; }
        }));
      }
      deleg.sort((a, b) => b.pct - a.pct);

      const acts = actividades || [];
      const aprobadas = acts.filter((a) => a.estado === 'aprobado').length;
      const pendientes = acts.filter((a) => a.estado === 'pendiente').length;
      const cumplimiento = deleg.length ? Math.round(deleg.reduce((a, d) => a + d.pct, 0) / deleg.length)
        : acts.length ? Math.round((aprobadas / acts.length) * 100) : 0;

      // Variación de actividades: este mes vs mes anterior
      const hoy = new Date();
      const claveMes = (d) => `${d.getFullYear()}-${d.getMonth()}`;
      const ant = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const cuenta = (k) => acts.filter((a) => claveMes(new Date(`${a.fecha}T00:00:00`)) === k).length;
      const [m1, m0] = [cuenta(claveMes(hoy)), cuenta(claveMes(ant))];
      const dAct = m0 > 0 ? Math.round(((m1 - m0) / m0) * 100) : null;

      // Serie: % de actividades aprobadas por mes (últimos 8 meses). Solo se muestra si hay datos suficientes.
      const serie = Array.from({ length: 8 }, (_, i) => {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - (7 - i), 1);
        const delMes = acts.filter((a) => claveMes(new Date(`${a.fecha}T00:00:00`)) === claveMes(d));
        return { mes: MESES[d.getMonth()], actual: delMes.length ? Math.round((delMes.filter((a) => a.estado === 'aprobado').length / delMes.length) * 100) : null, meta: periodo?.umbral_colectivo ?? 80 };
      });

      const hoyISO = iso(hoy);
      const prox = (compromisos || []).filter((c) => c.fecha_compromiso >= hoyISO && c.estado !== 'realizado')
        .sort((a, b) => a.fecha_compromiso.localeCompare(b.fecha_compromiso)).slice(0, 4);

      let promedio = 0;
      if (periodo) {
        const dias = Math.max(1, Math.min((hoy - new Date(`${periodo.fecha_inicio}T00:00:00`)) / 864e5 + 1, (new Date(periodo.fecha_termino) - new Date(periodo.fecha_inicio)) / 864e5 + 1));
        promedio = Math.round(acts.length / dias);
      }

      if (!vivo) return;
      setDatos({
        demo: false,
        cargando: false,
        kpis: [
          { id: 'deleg', label: 'Delegaciones', valor: delegaciones?.length ?? 0, sub: 'activas en el sistema' },
          { id: 'func', label: 'Funcionarios', valor: usuarios?.length ?? deleg.reduce((a, d) => a + d.n, 0), sub: 'usuarios registrados' },
          { id: 'act', label: 'Actividades', valor: acts.length, sub: dAct === null ? 'registradas' : 'vs. mes anterior', delta: dAct === null ? null : { txt: `${dAct > 0 ? '+' : ''}${dAct}%`, up: dAct >= 0 } },
          { id: 'cump', label: 'Cumplimiento', valor: cumplimiento, sufijo: '%', sub: deleg.length ? 'promedio del periodo' : 'actividades aprobadas' },
        ],
        cumplimiento,
        delegaciones: deleg,
        serie: serie.filter((s) => s.actual !== null).length >= 3 ? serie : [],
        ultimos: acts.slice(0, 4).map((a) => ({ t: a.descripcion, s: a.item_nombre || '', f: fmtFecha(a.fecha) })),
        agenda: prox.map((c) => ({
          hora: new Date(`${c.fecha_compromiso}T00:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
          t: c.origen || c.solicitante, s: c.delegacion_nombre || c.territorio || '', estado: ESTADO_AGENDA[c.estado] || c.estado,
        })),
        agendaHoy: prox.some((c) => c.fecha_compromiso === hoyISO),
        periodo: periodo ? { nombre: periodo.nombre, inicio: periodo.fecha_inicio, fin: periodo.fecha_termino } : null,
        resumen: [
          { l: 'Total de ingresos', v: acts.length }, { l: 'Actividades realizadas', v: aprobadas },
          { l: 'Actividades pendientes', v: pendientes }, { l: 'Promedio diario', v: promedio },
        ],
      });
    })();
    return () => { vivo = false; };
  }, []);

  return datos;
}
