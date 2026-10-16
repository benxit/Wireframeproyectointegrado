import CrudSimple from '../components/CrudSimple';

export default function Delegaciones() {
  return (
    <CrudSimple
      titulo="Delegaciones"
      subtitulo="Una delegación con historia no se elimina: desactívala para que no aparezca en registros nuevos."
      endpoint="delegaciones"
      columnas={[
        { key: 'id', label: 'ID' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'ambito', label: 'Ámbito' },
        { key: 'estado', label: 'Estado' },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre', required: true },
        { name: 'ambito', label: 'Ámbito / territorio' },
        {
          name: 'estado', label: 'Estado', type: 'select', required: true,
          options: [{ value: 'activa', label: 'Activa' }, { value: 'inactiva', label: 'Inactiva' }],
        },
      ]}
    />
  );
}
