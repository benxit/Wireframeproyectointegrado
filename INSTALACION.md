# SGR · Municipalidad de La Serena — Versión de presentación

Sistema de Gestión de Resultados con datos precargados, listo para recorrer sin instalar base de datos ni backend.

## Puesta en marcha

```bash
npm install
npm run dev        # http://localhost:5174
```

Versión compilada:

```bash
npm run build
npm run preview    # http://localhost:4174
```

## Acceso por rol

| Usuario            | Rol           |
|--------------------|---------------|
| `admin_demo`       | Administrador |
| `coordinador_demo` | Coordinador   |
| `delegado_demo`    | Delegado      |
| `funcionario_demo` | Funcionario   |
| `verificador_demo` | Verificador   |
| `consulta_demo`    | Consulta      |

Se ingresa con el nombre de usuario exacto y cualquier contraseña.

## Datos

La información se carga en memoria al iniciar (`servidor/datos.js`) y vuelve a su estado inicial cada vez que se reinicia el servidor.
