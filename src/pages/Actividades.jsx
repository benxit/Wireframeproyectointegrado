import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Paperclip, Upload, Check, X, FileCheck2, RotateCcw, Download, MessageSquare, Filter, History } from 'lucide-react';
import { ok, aviso, fallo, confirmar, pedirTexto, mensajeError, confeti, dialogo } from '../lib/alertas';
import { abrirComentarios, esc } from '../lib/comentarios';
import { descargar, lista } from '../lib/descargas';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const ESTILO_ESTADO = {
  pendiente: 'bg-amber-50 text-amber-700',
  correccion: 'bg-sky-50 text-sky-700',
  aprobado: 'bg-emerald-50 text-emerald-700',
  rechazado: 'bg-brand-50 text-brand-700',
};
const ESTADOS = [['pendiente', 'Pendiente'], ['correccion', 'Requiere corrección'], ['aprobado', 'Aprobado'], ['rechazado', 'Rechazado']];
const FORMATOS = '.jpg,.jpeg,.png,.webp,.pdf';
const MAX_MB = 5;

export default function Actividades() {
  const { usuario, tieneRol } = useAuth();
  const puedeValidar = tieneRol('Administrador', 'Verificador');
  const puedeRegistrar = tieneRol('Administrador', 'Coordinador', 'Delegado', 'Funcionario', 'Verificador');
  const veVariasDelegaciones = tieneRol('Administrador', 'Coordinador', 'Verificador');
  const [params] = useSearchParams();

  const [actividades, setActividades] = useState([]);
  const [items, setItems] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [delegaciones, setDelegaciones] = useState([]);
  const [form, setForm] = useState({});
  const [archivo, setArchivo] = useState({});
  const [filtros, setFiltros] = useState({ codigo: params.get('codigo') || '' });
  const [cargando, setCargando] = useState(true);

  // Solo ítems vigentes del cargo propio (RF-003) y periodos abiertos (RN-013).
  const itemsPropios = useMemo(() => items.filter((i) => i.vigente && (!usuario?.cargo_nombre || i.cargo_nombre === usuario.cargo_nombre)), [items, usuario]);
  const periodosAbiertos = periodos.filter((p) => p.estado === 'abierto');

  async function cargarActividades(f = filtros) {
    setCargando(true);
    try {
      const limpio = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
      setActividades(lista((await api.get('/actividades/', { params: limpio })).data));
    } catch (err) {
      fallo(mensajeError(err, 'No se pudieron cargar las actividades.'));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    const get = (u) => api.get(u).then((r) => lista(r.data)).catch(() => []);
    Promise.all([get('/items/'), get('/periodos/'), get('/catalogo/?activo=true'), veVariasDelegaciones ? get('/delegaciones/') : []])
      .then(([i, p, c, d]) => { setItems(i); setPeriodos(p); setCatalogo(c); setDelegaciones(d); });
    cargarActividades();
  }, []);

  function onChange(name, value) { setForm((f) => ({ ...f, [name]: value })); }
  function onFiltro(name, value) { setFiltros((f) => ({ ...f, [name]: value })); }

  async function onSubmit(e) {
    e.preventDefault();
    try {
      const { data } = await api.post('/actividades/', form);
      setForm({});
      cargarActividades();
      ok('Actividad registrada', `Código ${data.codigo_evidencia}. Adjunta la evidencia para que pueda validarse.`);
    } catch (err) {
      fallo(mensajeError(err, 'No se pudo registrar la actividad.'));
    }
  }

  async function subirEvidencia(id) {
    const file = archivo[id];
    if (!file) { aviso('info', 'Selecciona un archivo primero'); return; }
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!FORMATOS.split(',').includes(ext)) { fallo(`Formato no permitido. Usa: ${FORMATOS.replaceAll(',', ', ')}.`); return; }
    if (file.size > MAX_MB * 1024 * 1024) { fallo(`El archivo supera el máximo de ${MAX_MB} MB.`); return; }
    const fd = new FormData();
    fd.append('archivo', file);
    try {
      await api.post(`/actividades/${id}/subir_evidencia/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      ok('Evidencia cargada', 'El archivo quedó asociado al código de la actividad.');
      setArchivo((s) => ({ ...s, [id]: null }));
      cargarActividades();
    } catch (err) {
      fallo(mensajeError(err, 'No se pudo subir el archivo.'));
    }
  }

  async function validar(a, decision) {
    let observacion = '';
    if (decision === 'aprobado') {
      const si = await confirmar({ titulo: '¿Aprobar esta actividad?', texto: 'Contará una vez para el cumplimiento de la meta.', confirmar: 'Sí, aprobar' });
      if (!si) return;
    } else {
      const rechazo = decision === 'rechazado';
      observacion = await pedirTexto({
        titulo: rechazo ? 'Rechazar actividad' : 'Solicitar corrección',
        texto: 'Indica el motivo. Será visible para el funcionario.',
        placeholder: 'Ej: la foto no muestra la dirección visitada…', confirmar: rechazo ? 'Rechazar' : 'Solicitar corrección',
      });
      if (observacion === null) return;
    }
    try {
      await api.post(`/actividades/${a.id}/validar/`, { decision, observacion });
      if (decision === 'aprobado') { ok('Actividad aprobada'); confeti({ y: 0.5, cantidad: 80 }); } else aviso('info', decision === 'rechazado' ? 'Actividad rechazada' : 'Corrección solicitada');
      cargarActividades();
    } catch (err) {
      fallo(mensajeError(err, 'No se pudo registrar la validación.'));
    }
  }

  function verHistorial(a) {
    const filas = a.validaciones.length
      ? a.validaciones.map((v) => `<li style="text-align:left;margin:.4rem 0"><b>${esc(ESTADOS.find((e) => e[0] === v.decision)?.[1] || v.decision)}</b>
          · ${esc(v.fecha)} · ${esc(v.verificador_nombre || 'Verificador')}${v.observacion ? `<br><span style="opacity:.8">${esc(v.observacion)}</span>` : ''}</li>`).join('')
      : '<p>Aún no ha sido revisada.</p>';
    dialogo.fire({ title: `Historial ${esc(a.codigo_evidencia)}`, html: `<ul style="list-style:none;padding:0">${filas}</ul>`, confirmButtonText: 'Cerrar' });
  }

  const campoClase = 'w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition text-sm';
  const filtroClase = 'px-3 py-1.5 rounded-lg border border-stone-300 text-sm';
  const iconBtn = 'text-stone-400 hover:text-brand-600 transition';

  return (
    <div>
      <h1 className="font-display text-2xl text-stone-900 mb-4">Actividades</h1>

      {puedeRegistrar && (
        <form onSubmit={onSubmit} className="bg-white border border-stone-200 rounded-xl p-5 mb-6 max-w-2xl grid sm:grid-cols-2 gap-4">
          <div><label htmlFor="a-item" className="block text-sm font-medium text-stone-700 mb-1">Ítem a medir</label>
            <select id="a-item" className={campoClase} value={form.item || ''} onChange={(e) => onChange('item', e.target.value)} required>
              <option value="">-- Seleccione --</option>
              {itemsPropios.map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.cargo_nombre})</option>)}
            </select></div>
          <div><label htmlFor="a-periodo" className="block text-sm font-medium text-stone-700 mb-1">Periodo</label>
            <select id="a-periodo" className={campoClase} value={form.periodo || ''} onChange={(e) => onChange('periodo', e.target.value)} required>
              <option value="">-- Seleccione --</option>
              {periodosAbiertos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select></div>
          <div><label htmlFor="a-fecha" className="block text-sm font-medium text-stone-700 mb-1">Fecha</label>
            <input id="a-fecha" type="date" max={new Date().toISOString().slice(0, 10)} className={campoClase} value={form.fecha || ''} onChange={(e) => onChange('fecha', e.target.value)} required /></div>
          <div><label htmlFor="a-servicio" className="block text-sm font-medium text-stone-700 mb-1">Servicio / atención (catálogo)</label>
            <select id="a-servicio" className={campoClase} value={form.servicio || ''} onChange={(e) => onChange('servicio', e.target.value || null)}>
              <option value="">-- Sin clasificar --</option>
              {catalogo.map((c) => <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}
            </select></div>
          <div><label htmlFor="a-contacto" className="block text-sm font-medium text-stone-700 mb-1">Contacto</label>
            <input id="a-contacto" className={campoClase} value={form.contacto || ''} onChange={(e) => onChange('contacto', e.target.value)} maxLength={150} /></div>
          <div><label htmlFor="a-tel" className="block text-sm font-medium text-stone-700 mb-1">Teléfono del contacto</label>
            <input id="a-tel" type="tel" placeholder="+56 9 1234 5678" className={campoClase} value={form.telefono || ''} onChange={(e) => onChange('telefono', e.target.value)} /></div>
          <div className="sm:col-span-2"><label htmlFor="a-desc" className="block text-sm font-medium text-stone-700 mb-1">Actividad / solicitud / problema</label>
            <input id="a-desc" className={campoClase} value={form.descripcion || ''} onChange={(e) => onChange('descripcion', e.target.value)} required minLength={3} maxLength={255} /></div>
          <div className="sm:col-span-2"><label htmlFor="a-accion" className="block text-sm font-medium text-stone-700 mb-1">Acción ejecutada</label>
            <input id="a-accion" className={campoClase} value={form.accion || ''} onChange={(e) => onChange('accion', e.target.value)} maxLength={255} /></div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-stone-600">
            <input type="checkbox" checked={form.ingreso_agenda || false} onChange={(e) => onChange('ingreso_agenda', e.target.checked)} className="accent-brand-600" />
            Ingresar también a la agenda colectiva
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              <FileCheck2 size={16} /> Registrar actividad
            </button>
          </div>
        </form>
      )}

      <form onSubmit={(e) => { e.preventDefault(); cargarActividades(); }} className="bg-white border border-stone-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end">
        <label className="block"><span className="text-xs text-stone-500 block mb-1">Periodo</span>
          <select className={filtroClase} value={filtros.periodo || ''} onChange={(e) => onFiltro('periodo', e.target.value)}>
            <option value="">Todos</option>{periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select></label>
        <label className="block"><span className="text-xs text-stone-500 block mb-1">Estado</span>
          <select className={filtroClase} value={filtros.estado || ''} onChange={(e) => onFiltro('estado', e.target.value)}>
            <option value="">Todos</option>{ESTADOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></label>
        <label className="block"><span className="text-xs text-stone-500 block mb-1">Ítem</span>
          <select className={filtroClase} value={filtros.item || ''} onChange={(e) => onFiltro('item', e.target.value)}>
            <option value="">Todos</option>{items.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select></label>
        {delegaciones.length > 1 && (
          <label className="block"><span className="text-xs text-stone-500 block mb-1">Delegación</span>
            <select className={filtroClase} value={filtros.delegacion || ''} onChange={(e) => onFiltro('delegacion', e.target.value)}>
              <option value="">Todas</option>{delegaciones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select></label>
        )}
        <label className="block"><span className="text-xs text-stone-500 block mb-1">Desde</span>
          <input type="date" className={filtroClase} value={filtros.desde || ''} onChange={(e) => onFiltro('desde', e.target.value)} /></label>
        <label className="block"><span className="text-xs text-stone-500 block mb-1">Hasta</span>
          <input type="date" className={filtroClase} value={filtros.hasta || ''} onChange={(e) => onFiltro('hasta', e.target.value)} /></label>
        <label className="block"><span className="text-xs text-stone-500 block mb-1">Código</span>
          <input className={`${filtroClase} w-36 font-mono`} placeholder="SGR-…" value={filtros.codigo || ''} onChange={(e) => onFiltro('codigo', e.target.value.trim())} /></label>
        <button type="submit" className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-700 text-white text-sm px-3 py-1.5 rounded-lg transition"><Filter size={14} /> Filtrar</button>
        <button type="button" onClick={() => { setFiltros({}); cargarActividades({}); }} className="text-sm text-stone-500 hover:text-stone-700 px-2 py-1.5">Limpiar</button>
        <button type="button" onClick={() => descargar('/informes/actividades.csv', filtros, 'actividades.csv')}
          className="ml-auto flex items-center gap-1.5 border border-stone-300 hover:border-brand-500 hover:text-brand-700 text-sm px-3 py-1.5 rounded-lg transition">
          <Download size={14} /> Exportar CSV
        </button>
      </form>

      <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-left text-stone-500">
              <th className="px-4 py-2.5 font-medium">Código</th><th className="px-4 py-2.5 font-medium">Fecha</th>
              <th className="px-4 py-2.5 font-medium">Funcionario</th><th className="px-4 py-2.5 font-medium">Ítem</th>
              <th className="px-4 py-2.5 font-medium">Descripción</th><th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5 font-medium">Evidencia</th>
              <th className="px-4 py-2.5 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {actividades.map((a) => {
              const esMia = a.funcionario === usuario?.id;
              const puedeCargar = (esMia || tieneRol('Administrador')) && a.estado !== 'aprobado' && a.periodo_estado === 'abierto';
              const motivo = a.ultima_validacion?.observacion;
              return (
                <tr key={a.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 align-top">
                  <td className="px-4 py-2.5 font-mono text-xs text-stone-500">{a.codigo_evidencia}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{a.fecha}</td>
                  <td className="px-4 py-2.5">{a.funcionario_nombre}</td>
                  <td className="px-4 py-2.5">{a.item_nombre}{a.servicio_nombre && <span className="block text-xs text-stone-400">{a.servicio_nombre}</span>}</td>
                  <td className="px-4 py-2.5">{a.descripcion}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => verHistorial(a)} title="Ver historial de validación"
                      className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${ESTILO_ESTADO[a.estado] || 'bg-stone-100 text-stone-600'}`}>{a.estado_nombre}</button>
                    {motivo && a.estado !== 'aprobado' && <span className="block text-xs text-stone-500 mt-1 max-w-[14rem]">“{motivo}”</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col gap-1.5">
                      {a.evidencia && (
                        <button onClick={() => descargar(`/actividades/${a.id}/evidencia/`, {}, a.codigo_evidencia)}
                          className="flex items-center gap-1 text-brand-600 hover:underline text-xs" title={a.evidencia.nombre_original}>
                          <Paperclip size={13} /> Descargar
                        </button>
                      )}
                      {puedeCargar && (
                        <div className="flex items-center gap-1.5">
                          <input type="file" accept={FORMATOS} aria-label={`Evidencia para ${a.codigo_evidencia}`}
                            onChange={(e) => setArchivo((s) => ({ ...s, [a.id]: e.target.files[0] }))} className="text-xs w-28" />
                          <button onClick={() => subirEvidencia(a.id)} className={iconBtn} title={a.evidencia ? 'Reemplazar evidencia' : 'Subir evidencia'} aria-label="Subir evidencia"><Upload size={15} /></button>
                        </div>
                      )}
                      {!a.evidencia && !puedeCargar && <span className="text-xs text-stone-400">Sin evidencia</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-2">
                      {puedeValidar && !esMia && a.periodo_estado === 'abierto' && (
                        <>
                          {a.estado !== 'aprobado' && a.evidencia && <button onClick={() => validar(a, 'aprobado')} className="text-emerald-500 hover:text-emerald-700" title="Aprobar" aria-label="Aprobar"><Check size={16} /></button>}
                          {a.estado !== 'correccion' && <button onClick={() => validar(a, 'correccion')} className="text-sky-500 hover:text-sky-700" title="Solicitar corrección" aria-label="Solicitar corrección"><RotateCcw size={15} /></button>}
                          {a.estado !== 'rechazado' && <button onClick={() => validar(a, 'rechazado')} className="text-brand-500 hover:text-brand-700" title={a.estado === 'aprobado' ? 'Anular aprobación' : 'Rechazar'} aria-label="Rechazar"><X size={16} /></button>}
                        </>
                      )}
                      <button onClick={() => verHistorial(a)} className={iconBtn} title="Historial" aria-label="Historial"><History size={15} /></button>
                      <button onClick={() => abrirComentarios({ entidad: 'actividad', objetoId: a.id, titulo: `Comentarios ${a.codigo_evidencia}`, puedeEscribir: puedeRegistrar })}
                        className={iconBtn} title="Comentarios" aria-label="Comentarios"><MessageSquare size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!cargando && actividades.length === 0 && (
              <tr><td colSpan="8" className="px-4 py-6 text-center text-stone-400">No hay actividades con estos filtros.</td></tr>
            )}
          </tbody>
        </table>
        {cargando && <p className="px-4 py-3 text-sm text-stone-400">Cargando...</p>}
      </div>
    </div>
  );
}
