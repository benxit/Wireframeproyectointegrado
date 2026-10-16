import { useEffect, useState } from 'react';
import api from '../api/client';
import CrudSimple from '../components/CrudSimple';

export default function Cargos() {
  const [cargos, setCargos] = useState(null);

  useEffect(() => {
    api.get('/cargos/').then(({ data }) => setCargos(data));
  }, []);

  return (
    <div>
      <CrudSimple
        titulo="Cargos"
        endpoint="cargos"
        columnas={[
          { key: 'id', label: 'ID' },
          { key: 'nombre', label: 'Nombre' },
          { key: 'descripcion', label: 'Descripcion' },
        ]}
        campos={[
          { name: 'nombre', label: 'Nombre del cargo', required: true },
          { name: 'descripcion', label: 'Descripcion' },
        ]}
      />

      <div className="h-px bg-stone-200 my-8" />

      {cargos && (
        <CrudSimple
          titulo="Ítems medibles por cargo (funciones / indicadores)"
          endpoint="items"
          columnas={[
            { key: 'id', label: 'ID' },
            { key: 'nombre', label: 'Nombre' },
            { key: 'cargo_nombre', label: 'Cargo' },
            { key: 'tipo', label: 'Tipo' },
            { key: 'unidad', label: 'Unidad' },
            { key: 'vigente', label: 'Vigente' },
          ]}
          campos={[
            {
              name: 'cargo', label: 'Cargo', type: 'select', required: true,
              options: cargos.map((c) => ({ value: c.id, label: c.nombre })),
            },
            { name: 'nombre', label: 'Nombre del item', required: true },
            {
              name: 'tipo', label: 'Tipo', type: 'select', required: true,
              options: [{ value: 'cuantitativo', label: 'Cuantitativo' }, { value: 'porcentual', label: 'Porcentual' }],
            },
            { name: 'unidad', label: 'Unidad (ej: atenciones, informes)' },
            {
              name: 'vigente', label: 'Vigente', type: 'select', sinVacio: true,
              options: [{ value: 'true', label: 'Sí (se puede asignar en metas nuevas)' }, { value: 'false', label: 'No (se conserva en el historial)' }],
            },
          ]}
        />
      )}
    </div>
  );
}
