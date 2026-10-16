import { useEffect, useState } from 'react';
import api from '../api/client';
import CrudSimple from '../components/CrudSimple';
import { lista } from '../lib/descargas';

const TIPOS = [
  { value: 'actividad', label: 'Actividad' },
  { value: 'servicio', label: 'Servicio' },
  { value: 'atencion', label: 'Atención' },
  { value: 'subatencion', label: 'Subatención' },
];

export default function Catalogo() {
  const [atenciones, setAtenciones] = useState([]);
  const cargarPadres = () => api.get('/catalogo/', { params: { tipo: 'atencion' } }).then(({ data }) => setAtenciones(lista(data))).catch(() => {});
  useEffect(() => { cargarPadres(); }, []);

  return (
    <CrudSimple
      titulo="Catálogo de actividades y servicios"
      subtitulo="Estandariza la clasificación de los registros. Desactivar un elemento lo oculta en registros nuevos sin alterar los históricos."
      endpoint="catalogo"
      alCambiar={cargarPadres}
      columnas={[
        { key: 'codigo', label: 'Código' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'tipo_nombre', label: 'Tipo' },
        { key: 'area', label: 'Área' },
        { key: 'padre_nombre', label: 'Pertenece a', render: (c) => c.padre_nombre || '-' },
        { key: 'activo', label: 'Activo' },
      ]}
      campos={[
        { name: 'codigo', label: 'Código único (ej: SOC-01)', required: true },
        { name: 'nombre', label: 'Nombre', required: true },
        { name: 'tipo', label: 'Tipo', type: 'select', required: true, options: TIPOS },
        { name: 'area', label: 'Área (ej: Social, Territorial)', required: true },
        { name: 'padre', label: 'Atención a la que pertenece (solo subatenciones)', type: 'select',
          options: atenciones.map((a) => ({ value: a.id, label: `${a.codigo} · ${a.nombre}` })) },
        { name: 'activo', label: 'Activo', type: 'select', sinVacio: true,
          options: [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }] },
      ]}
    />
  );
}
