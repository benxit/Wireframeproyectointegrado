import { useEffect, useState } from 'react';
import { Plus, X, Pencil } from 'lucide-react';
import { ok, fallo, mensajeError } from '../lib/alertas';
import api from '../api/client';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [delegaciones, setDelegaciones] = useState([]);
  const [form, setForm] = useState({ roles_ids: [] });
  const [editandoId, setEditandoId] = useState(null);

  async function cargarTodo() {
    const [u, g, c, d] = await Promise.all([
      api.get('/usuarios/'), api.get('/grupos/'), api.get('/cargos/'), api.get('/delegaciones/'),
    ]);
    setUsuarios(u.data); setGrupos(g.data); setCargos(c.data); setDelegaciones(d.data);
  }
  const [mascaras, setMascaras] = useState({});
  useEffect(() => { cargarTodo(); }, []);

  function onChange(name, value) { setForm((f) => ({ ...f, [name]: value })); }
  function onChangeRol(id, checked) {
    setForm((f) => {
      const actuales = f.roles_ids || [];
      return { ...f, roles_ids: checked ? [...actuales, id] : actuales.filter((r) => r !== id) };
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    try {
      // En edicion, los datos sensibles vacios = "no cambiar" (nunca se envian en blanco)
      const datos = { ...form };
      if (editandoId) ['rut', 'email', 'telefono'].forEach((k) => { if (!datos[k]) delete datos[k]; });
      if (editandoId) await api.patch(`/usuarios/${editandoId}/`, datos);
      else await api.post('/usuarios/', datos);
      ok(editandoId ? 'Usuario actualizado' : 'Usuario creado');
      setForm({ roles_ids: [] });
      setMascaras({});
      setEditandoId(null);
      cargarTodo();
    } catch (err) {
      fallo(mensajeError(err, 'No se pudo guardar el usuario.'));
    }
  }

  function onEditar(u) {
    setEditandoId(u.id);
    setMascaras({ rut: u.rut_masked, email: u.email_masked, telefono: u.telefono_masked });
    setForm({
      username: u.username, first_name: u.first_name, last_name: u.last_name,
      cargo: u.cargo, delegacion: u.delegacion,
      estado: u.estado, roles_ids: grupos.filter((g) => u.roles.includes(g.name)).map((g) => g.id),
    });
  }

  const campoClase = 'w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition text-sm';

  return (
    <div>
      <h1 className="font-display text-2xl text-stone-900 mb-4">Usuarios y roles</h1>

      <form onSubmit={onSubmit} className="bg-white border border-stone-200 rounded-xl p-5 mb-6 max-w-2xl">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Usuario</label>
            <input className={campoClase} value={form.username || ''} onChange={(e) => onChange('username', e.target.value)} required /></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Nombre</label>
            <input className={campoClase} value={form.first_name || ''} onChange={(e) => onChange('first_name', e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Apellido</label>
            <input className={campoClase} value={form.last_name || ''} onChange={(e) => onChange('last_name', e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input className={campoClase} placeholder={editandoId ? `${mascaras.email || ''} (vacío = no cambiar)` : ''} value={form.email || ''} onChange={(e) => onChange('email', e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">RUT / identificador</label>
            <input className={campoClase} placeholder={editandoId ? `${mascaras.rut || ''} (vacío = no cambiar)` : '12345678-5'} value={form.rut || ''} onChange={(e) => onChange('rut', e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Teléfono</label>
            <input className={campoClase} placeholder={editandoId ? `${mascaras.telefono || ''} (vacío = no cambiar)` : '+56 9 1234 5678'} value={form.telefono || ''} onChange={(e) => onChange('telefono', e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Contraseña {editandoId && '(en blanco = no cambiar)'}</label>
            <input type="password" className={campoClase} value={form.password || ''} onChange={(e) => onChange('password', e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Cargo</label>
            <select className={campoClase} value={form.cargo || ''} onChange={(e) => onChange('cargo', e.target.value)}>
              <option value="">-- Sin cargo --</option>
              {cargos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Delegación</label>
            <select className={campoClase} value={form.delegacion || ''} onChange={(e) => onChange('delegacion', e.target.value)}>
              <option value="">-- Sin delegación --</option>
              {delegaciones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Estado</label>
            <select className={campoClase} value={form.estado || 'activo'} onChange={(e) => onChange('estado', e.target.value)}>
              <option value="activo">Activo</option><option value="inactivo">Inactivo</option>
            </select></div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-stone-700 mb-2">Roles (puede tener más de uno)</label>
          <div className="flex flex-wrap gap-2">
            {grupos.map((g) => {
              const activo = (form.roles_ids || []).includes(g.id);
              return (
                <button
                  type="button" key={g.id}
                  onClick={() => onChangeRol(g.id, !activo)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    activo ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-stone-300 text-stone-600 hover:border-brand-300'
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button type="submit" className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            <Plus size={16} /> {editandoId ? 'Guardar cambios' : 'Crear usuario'}
          </button>
          {editandoId && (
            <button type="button" onClick={() => { setEditandoId(null); setForm({ roles_ids: [] }); }} className="flex items-center gap-1.5 text-stone-500 hover:text-stone-700 text-sm px-3 py-2">
              <X size={16} /> Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-left text-stone-500">
              <th className="px-4 py-2.5 font-medium">Usuario</th><th className="px-4 py-2.5 font-medium">Nombre</th>
              <th className="px-4 py-2.5 font-medium">Cargo</th><th className="px-4 py-2.5 font-medium">Delegación</th>
              <th className="px-4 py-2.5 font-medium">Roles</th><th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                <td className="px-4 py-2.5">{u.username}</td>
                <td className="px-4 py-2.5">{u.first_name} {u.last_name}</td>
                <td className="px-4 py-2.5 text-stone-600">{u.cargo_nombre || '-'}</td>
                <td className="px-4 py-2.5 text-stone-600">{u.delegacion_nombre || '-'}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">{r}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-stone-600">{u.estado}</td>
                <td className="px-4 py-2.5">
                  <button onClick={() => onEditar(u)} className="text-stone-400 hover:text-brand-600 transition"><Pencil size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
