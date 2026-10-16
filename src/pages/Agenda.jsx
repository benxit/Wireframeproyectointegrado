import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarPlus, AlertTriangle, Clock, Download, Filter, History, MessageSquare, UserRoundCog } from 'lucide-react';
import { ok, fallo, mensajeError, pedirTexto, dialogo } from '../lib/alertas';
import { abrirComentarios, esc } from '../lib/comentarios';
import { descargar, lista } from '../lib/descargas';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const ESTADOS = { ingresado: 'Ingresado', pendiente: 'Pendiente', en_proceso: 'En proceso', realizado: 'Realizado' };
// Igual que el backend (RF-018): transiciones controladas.
const TRANSICIONES = {
  ingresado: ['pendiente', 'en_proceso', 'realizado'],
  pendiente: ['en_proceso', 'realizado'],
  en_proceso: ['pendiente', 'realizado'],
  realizado: ['en_proceso'],
};
const ESTILO = {
  ingresado: 'bg-stone-100 text-stone-600', pendiente: 'bg-amber-50 text-amber-700',
  en_proceso: 'bg-sky-50 text-sky-700', realizado: 'bg-emerald-50 text-emerald-700',
};

export default function Agenda() {
  const { usuario, tieneRol } = useAuth();
  const [params] = useSearchParams();
  const destacado = Number(params.get('compromiso')) || null;
  const supervisa = tieneRol('Administrador', 'Coordinador', 'Delegado');
  const puedeEscribir = tieneRol('Administrador', 'Coordinador', 'Delegado', 'Funcionario', 'Verificador');

  const [compromisos, setCompromisos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [delegaciones, setDelegaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [umbral, setUmbral] = useState(80);
  const [form, setForm] = useState({});
  const [filtros, setFiltros] = useState({});

  const limpio = (f) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v != null));

  async function cargar(f = filtros) {
    try {
      const [c, r] = await Promise.all([api.get('/compromisos/', { params: limpio(f) }), api.get('/compromisos/resumen/', { params: limpio(f) })]);
      setCompromisos(lista(c.data));
      setResumen(r.data);
    } catch (err) {
      fallo(mensajeError(err, 'No se pudo cargar la agenda.'));
    }
  }

  useEffect(() => {
    const get = (u) => api.get(u).then((r) => lista(r.data)).catch(() => []);
    Promise.all([get('/delegaciones/'), get('/usuarios/'), get('/periodos/?estado=abierto')]).then(([d, u, p]) => {
      setDelegaciones(d.filter((x) => x.estado === 'activa'));
      setUsuarios(u.filter((x) => x.estado === 'activo'));
      if (p[0]) setUmbral(p[0].umbral_colectivo);
      setForm((f) => ({ ...f, delegacion: usuario?.delegacion || d[0]?.id || '' }));
    });
    cargar();
  }, []);

  // El responsable debe pertenecer a la delegación del compromiso (RF-017).
  const responsables = useMemo(() => usuarios.filter((u) => !form.delegacion || String(u.delegacion) === String(form.delegacion)), [usuarios, form.delegacion]);

  function onChange(name, value) { setForm((f) => ({ ...f, [name]: value })); }
  function onFiltro(name, value) { setFiltros((f) => ({ ...f, [name]: value })); }

  async function onSubmit(e) {
    e.preventDefault();
    try {
      await api.post('/compromisos/', form);
      setForm({ delegacion: form.delegacion });
      cargar();
      ok('Compromiso agendado');
    } catch (err) {
      fallo(mensajeError(err, 'No se pudo agendar el compromiso.'));
    }
  }

  async function cambiarEstado(c, estado) {
    const reabre = c.estado === 'realizado';
    const obs = await pedirTexto({
      titulo: `${ESTADOS[c.estado]} → ${ESTADOS[estado]}`,
      texto: reabre ? 'Indica por qué se reabre el compromiso.' : 'Observación de avance (opcional). Si no se cumplirá en la fecha, informa aquí al vecino.',
      placeholder: 'Ej: se coordinó con Obras para el jueves…', confirmar: 'Guardar', obligatorio: reabre,
    });
    if (obs === null) { cargar(); return; }
    try {
      await api.post(`/compromisos/${c.id}/cambiar_estado/`, { estado, observaciones: obs, version: c.version });
      ok('Estado actualizado');
    } catch (err) {
      fallo(mensajeError(err, 'No se pudo cambiar el estado.'));
    }
    cargar();
  }

  async function reasignar(c) {
    const opciones = usuarios.filter((u) => String(u.delegacion) === String(c.delegacion) && u.id !== c.responsable)
      .map((u) => `<option value="${u.id}">${esc(`${u.first_name} ${u.last_name}`.trim() || u.username)}</option>`).join('');
    if (!opciones) { fallo('No hay otros funcionarios activos en la delegación.'); return; }
    const r = await dialogo.fire({
      title: 'Reasignar compromiso',
      html: `<p style="margin:0 0 .6rem">Actual: <b>${esc(c.responsable_nombre || 'Sin asignar')}</b></p>
        <select id="re-resp" class="swal2-select" style="margin:.3rem 0;width:80%">${opciones}</select>
        <input id="re-fecha" type="date" class="swal2-input" value="${c.fecha_compromiso}" style="margin:.3rem 0" aria-label="Fecha comprometida">
        <textarea id="re-motivo" class="swal2-textarea" placeholder="Motivo (ej: licencia médica del responsable)" style="margin:.3rem 0"></textarea>`,
      showCancelButton: true, confirmButtonText: 'Reasignar', cancelButtonText: 'Cancelar', focusConfirm: false,
      preConfirm: () => {
        const motivo = document.getElementById('re-motivo').value.trim();
        if (motivo.length < 5) { dialogo.showValidationMessage('Indica el motivo (mínimo 5 caracteres).'); return false; }
        return { responsable: document.getElementById('re-resp').value, fecha_compromiso: document.getElementById('re-fecha').value, motivo };
      },
    });
    if (!r.isConfirmed) return;
    try {
      await api.patch(`/compromisos/${c.id}/`, { ...r.value, version: c.version });
      ok('Compromiso reasignado', 'El cambio quedó en el historial.');
    } catch (err) {
      fallo(mensajeError(err, 'No se pudo reasignar.'));
    }
    cargar();
  }

  function verHistorial(c) {
    const filas = c.historial.map((h) => `<li style="text-align:left;margin:.45rem 0">
      <b>${esc(h.tipo_nombre)}</b>${h.valor_anterior ? `: ${esc(h.valor_anterior)} → ` : ': '}${esc(h.valor_nuevo)}
      <br><span style="font-size:.78rem;opacity:.7">${esc(h.fecha)} · ${esc(h.autor_nombre || 'Sistema')}</span>
      ${h.observacion ? `<br><span style="font-size:.85rem">${esc(h.observacion)}</span>` : ''}</li>`).join('');
    dialogo.fire({ title: `Historial: ${esc(c.solicitante)}`, html: `<ul style="list-style:none;padding:0;max-height:18rem;overflow:auto">${filas}</ul>`, confirmButtonText: 'Cerrar' });
  }

  const campoClase = 'w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition text-sm';
  const filtroClase = 'px-3 py-1.5 rounded-lg border border-stone-300 text-sm';
  const iconBtn = 'text-stone-400 hover:text-brand-600 transition';
  const t = resumen?.total;
  const cumple = t && Number(t.porcentaje_realizado) >= umbral;

  return (
    <div>
      <h1 className="font-display text-2xl text-stone-900 mb-1">Tubo de Trabajo</h1>
      <p className="text-sm text-stone-500 mb-4">Agenda colectiva de compromisos con vecinos y organizaciones.</p>

      {t && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[['Compromisos', t.total], ['Realizados', t.realizados], ['Pendientes', t.total - t.realizados], ['Vencidos', t.vencidos], ['Fuera de plazo', t.fuera_de_plazo]].map(([l, v]) => (
            <div key={l} className="bg-white border border-stone-200 rounded-xl p-4">
              <p className="text-xs text-stone-500">{l}</p>
              <p className={`font-display text-2xl ${l === 'Vencidos' && v > 0 ? 'text-brand-700' : 'text-stone-900'}`}>{v}</p>
            </div>
          ))}
          <div className="col-span-2 sm:col-span-5 bg-white border border-stone-200 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-stone-600">Cumplimiento de la agenda: <b>{t.porcentaje_realizado}%</b> realizado</span>
              <span className={cumple ? 'text-emerald-700' : 'text-brand-700'}>Umbral exigido: {umbral}%</span>
            </div>
            <div className="h-2 rounded-full bg-stone-100 overflow-hidden" role="progressbar" aria-valuenow={Number(t.porcentaje_realizado)} aria-valuemin={0} aria-valuemax={100}>
              <div className={`h-full rounded-full transition-all duration-700 ${cumple ? 'bg-emerald-500' : 'bg-brand-600'}`} style={{ width: `${Math.min(Number(t.porcentaje_realizado), 100)}%` }} />
            </div>
            {resumen.por_funcionario.length > 1 && (
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-stone-500">
                {resumen.por_funcionario.map((f) => (
                  <span key={f.responsable_id ?? 'x'}>{f.responsable}: <b className="text-stone-700">{f.porcentaje_realizado}%</b> ({f.realizados}/{f.total}{f.vencidos ? `, ${f.vencidos} vencidos` : ''})</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {puedeEscribir && (
        <form onSubmit={onSubmit} className="bg-white border border-stone-200 rounded-xl p-5 mb-6 max-w-2xl grid sm:grid-cols-2 gap-4">
          <div><label htmlFor="c-del" className="block text-sm font-medium text-stone-700 mb-1">Delegación</label>
            <select id="c-del" className={campoClase} value={form.delegacion || ''} onChange={(e) => setForm((f) => ({ ...f, delegacion: e.target.value, responsable: '' }))} required>
              <option value="">-- Seleccione --</option>
              {delegaciones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select></div>
          <div><label htmlFor="c-sol" className="block text-sm font-medium text-stone-700 mb-1">Solicitante</label>
            <input id="c-sol" className={campoClase} value={form.solicitante || ''} onChange={(e) => onChange('solicitante', e.target.value)} required minLength={3} maxLength={150} /></div>
          <div><label htmlFor="c-ori" className="block text-sm font-medium text-stone-700 mb-1">Origen</label>
            <input id="c-ori" className={campoClase} placeholder="Solicitud vecinal, actividad…" value={form.origen || ''} onChange={(e) => onChange('origen', e.target.value)} maxLength={150} /></div>
          <div><label htmlFor="c-ter" className="block text-sm font-medium text-stone-700 mb-1">Territorio</label>
            <input id="c-ter" className={campoClase} value={form.territorio || ''} onChange={(e) => onChange('territorio', e.target.value)} maxLength={150} /></div>
          <div><label htmlFor="c-resp" className="block text-sm font-medium text-stone-700 mb-1">Responsable</label>
            <select id="c-resp" className={campoClase} value={form.responsable || ''} onChange={(e) => onChange('responsable', e.target.value)} required>
              <option value="">-- Seleccione --</option>
              {responsables.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select></div>
          <div><label htmlFor="c-apoyo" className="block text-sm font-medium text-stone-700 mb-1">Área de apoyo</label>
            <input id="c-apoyo" className={campoClase} placeholder="Obras, DIDECO, Seguridad…" value={form.area_apoyo || ''} onChange={(e) => onChange('area_apoyo', e.target.value)} maxLength={150} /></div>
          <div><label htmlFor="c-fecha" className="block text-sm font-medium text-stone-700 mb-1">Fecha comprometida</label>
            <input id="c-fecha" type="date" min={new Date().toISOString().slice(0, 10)} className={campoClase} value={form.fecha_compromiso || ''} onChange={(e) => onChange('fecha_compromiso', e.target.value)} required /></div>
          <div className="sm:col-span-2"><label htmlFor="c-obs" className="block text-sm font-medium text-stone-700 mb-1">Observaciones</label>
            <textarea id="c-obs" className={campoClase} value={form.observaciones || ''} onChange={(e) => onChange('observaciones', e.target.value)} /></div>
          <div className="sm:col-span-2">
            <button type="submit" className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              <CalendarPlus size={16} /> Registrar compromiso
            </button>
          </div>
        </form>
      )}

      <form onSubmit={(e) => { e.preventDefault(); cargar(); }} className="bg-white border border-stone-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end">
        <label className="block"><span className="text-xs text-stone-500 block mb-1">Estado</span>
          <select className={filtroClase} value={filtros.estado || ''} onChange={(e) => onFiltro('estado', e.target.value)}>
            <option value="">Todos</option>{Object.entries(ESTADOS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></label>
        <label className="block"><span className="text-xs text-stone-500 block mb-1">Responsable</span>
          <select className={filtroClase} value={filtros.responsable || ''} onChange={(e) => onFiltro('responsable', e.target.value)}>
            <option value="">Todos</option>{usuarios.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
          </select></label>
        <label className="block"><span className="text-xs text-stone-500 block mb-1">Plazo</span>
          <select className={filtroClase} value={filtros.vencido || ''} onChange={(e) => onFiltro('vencido', e.target.value)}>
            <option value="">Todos</option><option value="true">Vencidos</option><option value="false">Al día</option>
          </select></label>
        <label className="block"><span className="text-xs text-stone-500 block mb-1">Territorio</span>
          <input className={`${filtroClase} w-36`} value={filtros.territorio || ''} onChange={(e) => onFiltro('territorio', e.target.value)} /></label>
        <label className="block"><span className="text-xs text-stone-500 block mb-1">Desde</span>
          <input type="date" className={filtroClase} value={filtros.desde || ''} onChange={(e) => onFiltro('desde', e.target.value)} /></label>
        <label className="block"><span className="text-xs text-stone-500 block mb-1">Hasta</span>
          <input type="date" className={filtroClase} value={filtros.hasta || ''} onChange={(e) => onFiltro('hasta', e.target.value)} /></label>
        <button type="submit" className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-700 text-white text-sm px-3 py-1.5 rounded-lg transition"><Filter size={14} /> Filtrar</button>
        <button type="button" onClick={() => { setFiltros({}); cargar({}); }} className="text-sm text-stone-500 hover:text-stone-700 px-2 py-1.5">Limpiar</button>
        <button type="button" onClick={() => descargar('/informes/compromisos.csv', filtros, 'compromisos.csv')}
          className="ml-auto flex items-center gap-1.5 border border-stone-300 hover:border-brand-500 hover:text-brand-700 text-sm px-3 py-1.5 rounded-lg transition">
          <Download size={14} /> Exportar CSV
        </button>
      </form>

      <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-left text-stone-500">
              <th className="px-4 py-2.5 font-medium">Solicitante</th><th className="px-4 py-2.5 font-medium">Delegación</th>
              <th className="px-4 py-2.5 font-medium">Responsable</th><th className="px-4 py-2.5 font-medium">Fecha</th>
              <th className="px-4 py-2.5 font-medium">Estado</th><th className="px-4 py-2.5 font-medium">Cambiar estado</th>
              <th className="px-4 py-2.5 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {compromisos.map((c) => {
              const gestiona = supervisa || c.responsable === usuario?.id || c.creado_por === usuario?.id;
              const opciones = c.estado !== 'realizado' || supervisa ? TRANSICIONES[c.estado] : [];
              return (
                <tr key={c.id} className={`border-b border-stone-100 last:border-0 ${c.vencido ? 'bg-brand-50/40' : 'hover:bg-stone-50'} ${destacado === c.id ? 'ring-2 ring-inset ring-brand-400' : ''}`}>
                  <td className="px-4 py-2.5">{c.solicitante}{c.territorio && <span className="block text-xs text-stone-400">{c.territorio}</span>}</td>
                  <td className="px-4 py-2.5">{c.delegacion_nombre}</td>
                  <td className="px-4 py-2.5">{c.responsable_nombre || '-'}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {c.fecha_compromiso}
                    {c.vencido && <span className="flex items-center gap-1 text-xs text-brand-700"><AlertTriangle size={13} /> Vencido</span>}
                    {c.por_vencer && <span className="flex items-center gap-1 text-xs text-amber-700"><Clock size={13} /> Por vencer</span>}
                    {c.fuera_de_plazo && <span className="block text-xs text-stone-500">Realizado fuera de plazo</span>}
                  </td>
                  <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${ESTILO[c.estado]}`}>{c.estado_nombre}</span></td>
                  <td className="px-4 py-2.5">
                    {gestiona && opciones.length > 0 ? (
                      <select value="" onChange={(e) => e.target.value && cambiarEstado(c, e.target.value)} aria-label="Cambiar estado"
                        className="text-xs px-2 py-1 rounded-lg border border-stone-300">
                        <option value="">Mover a…</option>
                        {opciones.map((e) => <option key={e} value={e}>{ESTADOS[e]}</option>)}
                      </select>
                    ) : <span className="text-xs text-stone-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-2">
                      <button onClick={() => verHistorial(c)} className={iconBtn} title="Historial" aria-label="Historial"><History size={15} /></button>
                      {supervisa && c.estado !== 'realizado' && <button onClick={() => reasignar(c)} className={iconBtn} title="Reasignar" aria-label="Reasignar"><UserRoundCog size={15} /></button>}
                      <button onClick={() => abrirComentarios({ entidad: 'compromiso', objetoId: c.id, titulo: `Comentarios: ${c.solicitante}`, puedeEscribir })}
                        className={iconBtn} title="Comentarios" aria-label="Comentarios"><MessageSquare size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {compromisos.length === 0 && <tr><td colSpan="7" className="px-4 py-6 text-center text-stone-400">No hay compromisos con estos filtros.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
