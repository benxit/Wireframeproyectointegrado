import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, X, Plus } from 'lucide-react';
import { ok, fallo, confirmar, mensajeError } from '../lib/alertas';
import api from '../api/client';

const mostrar = (v) => (v === true ? 'Sí' : v === false ? 'No' : String(v ?? ''));

/**
 * CRUD genérico. Extras opcionales:
 * - columnas[].render(item): celda personalizada.
 * - acciones(item, recargar): botones extra por fila (p. ej. cerrar un periodo).
 * - editable(item) / eliminable(item): ocultan lápiz/papelera cuando no aplica.
 * - alCambiar(): se llama después de crear/editar/eliminar (para refrescar paneles relacionados).
 * El formulario reenvía `version`: si otro usuario guardó antes, la API responde 409 y no se sobrescribe.
 */
export default function CrudSimple({ titulo, endpoint, columnas, campos, acciones, editable, eliminable, alCambiar, subtitulo }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({});
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setCargando(true);
    try {
      const { data } = await api.get(`/${endpoint}/`);
      setItems(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      fallo(mensajeError(err, 'No se pudieron cargar los registros.'));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, [endpoint]);

  function onChange(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    try {
      if (editandoId) {
        await api.patch(`/${endpoint}/${editandoId}/`, form);
        ok('Cambios guardados', 'El registro se actualizó correctamente.');
      } else {
        await api.post(`/${endpoint}/`, form);
        ok('Registro creado', 'Se agregó correctamente.');
      }
      setForm({});
      setEditandoId(null);
      cargar();
      alCambiar?.();
    } catch (err) {
      if (err.response?.status === 409) { setForm({}); setEditandoId(null); cargar(); }
      fallo(mensajeError(err, 'No se pudo guardar el registro.'));
    }
  }

  function onEditar(item) {
    setEditandoId(item.id);
    setForm(item);
  }

  async function onEliminar(id) {
    const si = await confirmar({ titulo: '¿Eliminar este registro?', texto: 'Esta acción no se puede deshacer.', confirmar: 'Sí, eliminar', icono: 'warning', peligro: true });
    if (!si) return;
    try {
      await api.delete(`/${endpoint}/${id}/`);
      ok('Registro eliminado');
      cargar();
      alCambiar?.();
    } catch (err) {
      fallo(mensajeError(err, 'No se pudo eliminar. Puede estar en uso por otros registros.'));
    }
  }

  return (
    <div>
      <h1 className={`font-display text-2xl text-stone-900 ${subtitulo ? 'mb-1' : 'mb-4'}`}>{titulo}</h1>
      {subtitulo && <p className="text-sm text-stone-500 mb-4">{subtitulo}</p>}

      <form onSubmit={onSubmit} className="bg-white border border-stone-200 rounded-xl p-5 mb-6 max-w-2xl">
        <div className="grid sm:grid-cols-2 gap-4">
          {campos.map((c) => (
            <div key={c.name} className={c.ancho === 'full' ? 'sm:col-span-2' : ''}>
              <label htmlFor={`f-${endpoint}-${c.name}`} className="block text-sm font-medium text-stone-700 mb-1">{c.label}</label>
              {c.type === 'select' ? (
                <select
                  id={`f-${endpoint}-${c.name}`}
                  value={form[c.name] ?? ''}
                  onChange={(e) => onChange(c.name, e.target.value)}
                  required={c.required}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition text-sm"
                >
                  {!c.sinVacio && <option value="">-- Seleccione --</option>}
                  {c.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={`f-${endpoint}-${c.name}`}
                  type={c.type || 'text'}
                  step={c.step}
                  min={c.min}
                  max={c.max}
                  value={form[c.name] ?? ''}
                  onChange={(e) => onChange(c.name, e.target.value)}
                  required={c.required}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition text-sm"
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button
            type="submit"
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <Plus size={16} /> {editandoId ? 'Guardar cambios' : 'Crear'}
          </button>
          {editandoId && (
            <button
              type="button"
              onClick={() => { setEditandoId(null); setForm({}); }}
              className="flex items-center gap-1.5 text-stone-500 hover:text-stone-700 text-sm px-3 py-2"
            >
              <X size={16} /> Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-left text-stone-500">
              {columnas.map((c) => <th key={c.key} className="px-4 py-2.5 font-medium">{c.label}</th>)}
              <th className="px-4 py-2.5 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-b border-stone-100 last:border-0 hover:bg-stone-50"
                >
                  {columnas.map((c) => (
                    <td key={c.key} className="px-4 py-2.5 text-stone-700">{c.render ? c.render(item) : mostrar(item[c.key])}</td>
                  ))}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {(!editable || editable(item)) && (
                        <button onClick={() => onEditar(item)} className="text-stone-400 hover:text-brand-600 transition" title="Editar" aria-label="Editar">
                          <Pencil size={15} />
                        </button>
                      )}
                      {(!eliminable || eliminable(item)) && (
                        <button onClick={() => onEliminar(item.id)} className="text-stone-400 hover:text-brand-600 transition" title="Eliminar" aria-label="Eliminar">
                          <Trash2 size={15} />
                        </button>
                      )}
                      {acciones?.(item, () => { cargar(); alCambiar?.(); })}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {!cargando && items.length === 0 && (
              <tr><td colSpan={columnas.length + 1} className="px-4 py-6 text-center text-stone-400">Sin registros.</td></tr>
            )}
          </tbody>
        </table>
        {cargando && <p className="px-4 py-3 text-sm text-stone-400">Cargando...</p>}
      </div>
    </div>
  );
}
