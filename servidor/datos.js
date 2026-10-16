/**
 * Datos iniciales del SGR. Se cargan en memoria al iniciar el servidor.
 * Las fechas se calculan respecto del día actual (periodos, vencimientos y tableros).
 */
let semilla = 20260914;
const azar = () => ((semilla = (semilla * 48271) % 2147483647) / 2147483647);
const entre = (a, b) => a + Math.floor(azar() * (b - a + 1));
const elegir = (l) => l[Math.floor(azar() * l.length)];

export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const hoy = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; };
export const dia = (n) => { const d = hoy(); d.setDate(d.getDate() + n); return iso(d); };
export const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 864e5) + 1;
const hora = () => `${String(entre(8, 18)).padStart(2, '0')}:${String(entre(0, 59)).padStart(2, '0')}`;
export const ahora = () => `${dia(0)} ${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;

// ---------- Periodos: los dos trimestres anteriores (cerrados) y el actual (abierto) ----------
const H = hoy();
const q = Math.floor(H.getMonth() / 3);
function trimestre(k) {
  const ini = new Date(H.getFullYear(), (q + k) * 3, 1, 12);
  const fin = new Date(H.getFullYear(), (q + k) * 3 + 3, 0, 12);
  return { nombre: `Trimestre ${Math.floor(ini.getMonth() / 3) + 1} - ${ini.getFullYear()}`, fecha_inicio: iso(ini), fecha_termino: iso(fin) };
}
const periodos = [-2, -1, 0].map((k, i) => ({
  id: i + 1, ...trimestre(k), umbral_colectivo: 80, umbral_ambar: 70, estado: k === 0 ? 'abierto' : 'cerrado', version: 1,
}));
export const periodoDeFecha = (f) => periodos.find((p) => p.fecha_inicio <= f && f <= p.fecha_termino);

// ---------- Organización ----------
const delegaciones = [
  ['Centro', 'Casco histórico y sector centro'], ['Las Compañías', 'Sector norte'], ['La Antena', 'Sector oriente alto'],
  ['Rural', 'Algarrobito, Las Rojas y valle'], ['Avenida del Mar', 'Borde costero'], ['La Pampa', 'Sector sur'],
].map(([nombre, ambito], i) => ({ id: i + 1, nombre, ambito, estado: 'activa', version: 1 }));

const cargos = [
  ['Delegado territorial', 'Encabeza la delegación y coordina con la comunidad'],
  ['Gestor comunitario', 'Trabajo en terreno con organizaciones'],
  ['Asistente social', 'Atención y seguimiento de casos sociales'],
  ['Administrativo de atención', 'Atención de público y trámites'],
].map(([nombre, descripcion], i) => ({ id: i + 1, nombre, descripcion, version: 1 }));

const items = [
  [1, 'Reuniones con juntas de vecinos', 'cuantitativo', 'reuniones'], [1, 'Visitas territoriales', 'cuantitativo', 'visitas'],
  [1, 'Informes de gestión', 'cuantitativo', 'informes'],
  [2, 'Atenciones vecinales', 'cuantitativo', 'atenciones'], [2, 'Talleres comunitarios', 'cuantitativo', 'talleres'],
  [2, 'Operativos en terreno', 'cuantitativo', 'operativos'],
  [3, 'Casos sociales atendidos', 'cuantitativo', 'casos'], [3, 'Derivaciones efectivas', 'cuantitativo', 'derivaciones'],
  [3, 'Visitas domiciliarias', 'cuantitativo', 'visitas'],
  [4, 'Atenciones de ventanilla', 'cuantitativo', 'atenciones'], [4, 'Solicitudes tramitadas', 'cuantitativo', 'solicitudes'],
  [4, 'Respuesta en plazo', 'porcentual', '%'],
  [2, 'Encuestas de satisfacción (antiguo)', 'cuantitativo', 'encuestas'],
].map(([cargo, nombre, tipo, unidad], i) => ({ id: i + 1, cargo, nombre, tipo, unidad, vigente: i !== 12, version: 1 }));

const catalogo = [
  ['SOC-01', 'Atención social', 'atencion', 'Social', null], ['SOC-01.1', 'Orientación en beneficios', 'subatencion', 'Social', 1],
  ['SOC-01.2', 'Postulación a subsidios', 'subatencion', 'Social', 1], ['TER-01', 'Atención vecinal', 'atencion', 'Territorial', null],
  ['TER-01.1', 'Reclamo por alumbrado', 'subatencion', 'Territorial', 4], ['TER-01.2', 'Solicitud de poda', 'subatencion', 'Territorial', 4],
  ['TER-02', 'Reunión con junta de vecinos', 'actividad', 'Territorial', null], ['COM-01', 'Taller comunitario', 'actividad', 'Comunitaria', null],
  ['ADM-01', 'Certificado de residencia', 'servicio', 'Administrativa', null], ['ADM-02', 'Permiso de feria (antiguo)', 'servicio', 'Administrativa', null],
].map(([codigo, nombre, tipo, area, padre], i) => ({ id: i + 1, codigo, nombre, tipo, area, padre, activo: i !== 9, version: 1 }));

const grupos = ['Administrador', 'Coordinador', 'Delegado', 'Funcionario', 'Verificador', 'Consulta'].map((name, i) => ({ id: i + 1, name }));

// ---------- Usuarios ----------
const usuarios = [
  ['admin_demo', 'Camila', 'Rojas', ['Administrador'], null, null],
  ['coordinador_demo', 'Andrés', 'Fuentes', ['Coordinador'], null, null],
  ['delegado_demo', 'María José', 'Pizarro', ['Delegado'], 1, 1],
  ['funcionario_demo', 'Javier', 'Araya', ['Funcionario'], 2, 1],
  ['verificador_demo', 'Daniela', 'Castillo', ['Verificador'], 4, 1],
  ['consulta_demo', 'Roberto', 'Muñoz', ['Consulta'], null, null],
  ['vtorres', 'Valentina', 'Torres', ['Funcionario'], 3, 1],
  ['fcontreras', 'Felipe', 'Contreras', ['Delegado'], 1, 2],
  ['cvega', 'Constanza', 'Vega', ['Funcionario'], 2, 2],
  ['molivares', 'Matías', 'Olivares', ['Funcionario'], 3, 2],
  ['fdiaz', 'Francisca', 'Díaz', ['Delegado'], 1, 3],
  ['therrera', 'Tomás', 'Herrera', ['Funcionario'], 2, 3],
  ['isoto', 'Ignacio', 'Soto', ['Delegado'], 1, 4],
  ['creyes', 'Catalina', 'Reyes', ['Funcionario'], 3, 4],
  ['smorales', 'Sebastián', 'Morales', ['Delegado'], 1, 5],
  ['jnavarro', 'Josefa', 'Navarro', ['Funcionario'], 4, 5],
  ['dgallardo', 'Diego', 'Gallardo', ['Delegado'], 1, 6],
  ['acortes', 'Antonia', 'Cortés', ['Funcionario'], 2, 6],
  ['psaavedra', 'Pablo', 'Saavedra', ['Funcionario'], 4, 6],
].map(([username, first_name, last_name, roles, cargo, delegacion], i) => ({
  id: i + 1, username, first_name, last_name, roles, cargo, delegacion,
  estado: i === 18 ? 'inactivo' : 'activo',
  rut: `${entre(10, 21)}.${entre(100, 999)}.${entre(100, 999)}-${entre(0, 9)}`,
  email: `${username}@laserena.cl`,
  telefono: `+56 9 ${entre(5000, 9999)} ${entre(1000, 9999)}`,
  avatar: null, mfa_activo: false, codigos_restantes: 0,
  last_login: `${dia(-entre(0, 3))} ${hora()}`, date_joined: `${dia(-entre(200, 600))} 09:00`,
  password_actualizada: `${dia(-entre(10, 90))} ${hora()}`, version: 1,
}));
const medibles = usuarios.filter((u) => u.cargo && u.estado === 'activo');

// ---------- Metas y ajustes ----------
const metas = [];
for (const p of periodos) {
  const avanceEsperado = p.estado === 'cerrado' ? 1 : Math.min(1, diasEntre(p.fecha_inicio, dia(0)) / diasEntre(p.fecha_inicio, p.fecha_termino));
  for (const u of medibles) {
    const propios = items.filter((i) => i.cargo === u.cargo && i.vigente);
    const pond = p.estado === 'abierto' && u.username === 'therrera' ? [40, 30, 20] : [40, 30, 30];
    propios.forEach((it, k) => {
      const objetivo = it.tipo === 'porcentual' ? 90 : elegir([10, 12, 15, 20, 24, 30, 40]);
      metas.push({
        id: metas.length + 1, item: it.id, funcionario: u.id, periodo: p.id, valor_objetivo: objetivo.toFixed(2),
        ponderador: pond[k].toFixed(2), tope_cumplimiento: 120, version: 1,
        _avance: Math.round(objetivo * avanceEsperado * (0.45 + azar() * 0.8)),
      });
    });
  }
}

const ajustes = [
  { id: 1, funcionario: 4, periodo: 3, tipo: 'felicitacion', valor: '5.00', motivo: 'Felicitación escrita de la JJVV El Milagro por apoyo en operativo', responsable: 3, version: 1 },
  { id: 2, funcionario: 12, periodo: 3, tipo: 'reclamo', valor: '-3.00', motivo: 'Reclamo por atraso en respuesta a solicitud de vecina', responsable: 11, version: 1 },
  { id: 3, funcionario: 9, periodo: 2, tipo: 'felicitacion', valor: '4.00', motivo: 'Reconocimiento en cuenta pública de la delegación', responsable: 8, version: 1 },
];

// ---------- Actividades ----------
const DESCRIPCIONES = [
  'Reunión con junta de vecinos por luminarias apagadas', 'Visita a feria libre del sector', 'Atención a vecina por postulación a subsidio habitacional',
  'Taller de reciclaje en sede social', 'Operativo de limpieza en quebrada', 'Informe mensual de gestión territorial',
  'Coordinación con Obras por bacheo en calle Larrondo', 'Derivación a DIDECO por ayuda social', 'Visita domiciliaria a adulto mayor',
  'Entrega de certificado de residencia', 'Reunión con club deportivo por uso de multicancha', 'Recorrido por sector rural Algarrobito',
  'Atención por reclamo de recolección de basura', 'Charla de seguridad vecinal', 'Seguimiento a solicitud de poda de árboles',
];
const CONTACTOS = ['Rosa Tapia', 'Luis Carvajal', 'JJVV N°14 El Milagro', 'Club Adulto Mayor Los Aromos', 'Pedro Álvarez',
  'Comité de Vivienda Nueva Esperanza', 'Carmen Gutiérrez', 'Centro de Padres Escuela Gabriela Mistral'];
const ACCIONES = ['Se registró la solicitud y se derivó a la unidad correspondiente', 'Se coordinó visita técnica', 'Se entregó orientación y documentación',
  'Se acordó nueva reunión de seguimiento', 'Se resolvió en el momento'];
const OBS = {
  correccion: ['La foto no permite identificar la dirección visitada.', 'Falta la lista de asistencia firmada.', 'El documento adjunto está ilegible.'],
  rechazado: ['La actividad no corresponde al ítem indicado.', 'Evidencia duplicada de otro registro.'],
};

const actividades = [];
const desdeInicio = diasEntre(periodos[0].fecha_inicio, dia(0));
const diasActual = diasEntre(periodos[2].fecha_inicio, dia(0));
for (let i = 0; i < 80; i++) {
  const u = i < 6 ? usuarios[3] : elegir(medibles);
  const it = elegir(items.filter((x) => x.cargo === u.cargo && x.vigente));
  const fecha = dia(-(azar() < 0.5 || i < 6 ? entre(0, diasActual - 1) : entre(0, desdeInicio - 1)));
  const p = periodoDeFecha(fecha);
  let estado;
  if (p.estado === 'cerrado') estado = azar() < 0.88 ? 'aprobado' : 'rechazado';
  else estado = i < 6 ? ['pendiente', 'correccion', 'aprobado', 'pendiente', 'rechazado', 'aprobado'][i] : elegir(['pendiente', 'pendiente', 'correccion', 'aprobado', 'aprobado', 'aprobado', 'rechazado']);
  const conEvidencia = estado === 'aprobado' || (estado === 'pendiente' ? azar() < 0.7 : azar() < 0.5);
  const validaciones = estado === 'pendiente' ? [] : [{
    decision: estado, fecha: `${fecha} ${hora()}`, verificador_nombre: 'Daniela Castillo',
    observacion: OBS[estado] ? elegir(OBS[estado]) : '',
  }];
  const servicio = azar() < 0.6 ? elegir(catalogo.filter((c) => c.activo)).id : null;
  actividades.push({
    id: i + 1, codigo_evidencia: `SGR-${fecha.slice(0, 4)}-${String(i + 1).padStart(5, '0')}`, fecha,
    funcionario: u.id, delegacion: u.delegacion, item: it.id, periodo: p.id, servicio,
    descripcion: elegir(DESCRIPCIONES), contacto: elegir(CONTACTOS), telefono: '', accion: elegir(ACCIONES),
    estado, validaciones,
    evidencia: conEvidencia ? { nombre_original: elegir(['foto_terreno.jpg', 'acta_reunion.pdf', 'lista_asistencia.pdf', 'registro.png']) } : null,
    version: 1,
  });
}
actividades.sort((a, b) => b.fecha.localeCompare(a.fecha));

// ---------- Agenda colectiva (compromisos) ----------
const SOLICITANTES = ['JJVV N°12 Villa El Indio', 'Sra. Rosa Tapia', 'Club Deportivo Juventud Unida', 'Comité de Agua Potable Rural Las Rojas',
  'Sr. Hernán Pérez', 'JJVV Las Compañías Norte', 'Centro de Madres Los Copihues', 'Feria Libre Avenida Cuatro Esquinas',
  'Sra. Gloria Fernández', 'Agrupación Cultural Faro de Luz', 'JJVV San Joaquín', 'Escuela Rural Algarrobito',
  'Sr. Manuel Rivera', 'Comité de Adelanto La Pampa', 'Club Adulto Mayor Renacer', 'Sindicato de Pescadores Caleta San Pedro'];
const ORIGENES = ['Solicitud vecinal', 'Reunión comunitaria', 'Operativo en terreno', 'Actividad de la delegación'];
const AREAS = ['Obras', 'DIDECO', 'Aseo y Ornato', 'Seguridad Ciudadana', 'Tránsito', 'Medio Ambiente'];
const TERRITORIOS = ['Villa El Indio', 'Las Compañías Norte', 'Algarrobito', 'Caleta San Pedro', 'Cuatro Esquinas', 'San Joaquín', 'La Florida', 'El Milagro'];
const ESTADOS_AGENDA = { ingresado: 'Ingresado', pendiente: 'Pendiente', en_proceso: 'En proceso', realizado: 'Realizado' };

const compromisos = SOLICITANTES.map((solicitante, i) => {
  const delegacion = i < 5 ? 1 : (i % 6) + 1;
  const responsable = elegir(usuarios.filter((u) => u.delegacion === delegacion && u.estado === 'activo')).id;
  const offset = [-18, -9, -3, 2, 6, -25, -12, 1, 14, -6, 20, -30, 3, 9, -15, 25][i];
  const fecha_compromiso = dia(offset);
  let estado;
  if (offset < 0) estado = [0, 2, 5, 9, 11, 14].includes(i) ? 'realizado' : elegir(['pendiente', 'en_proceso']);
  else estado = elegir(['ingresado', 'pendiente', 'en_proceso', i === 8 ? 'realizado' : 'pendiente']);
  const creado = dia(offset - entre(10, 25));
  const autor = usuarios.find((u) => u.id === responsable);
  const nombre = `${autor.first_name} ${autor.last_name}`;
  const historial = [{ tipo_nombre: 'Creación', valor_anterior: '', valor_nuevo: 'Ingresado', fecha: `${creado} ${hora()}`, autor_nombre: nombre, observacion: '' }];
  if (estado !== 'ingresado') historial.push({ tipo_nombre: 'Estado', valor_anterior: 'Ingresado', valor_nuevo: ESTADOS_AGENDA[estado], fecha: `${dia(offset - 2)} ${hora()}`, autor_nombre: nombre, observacion: estado === 'realizado' ? 'Se cumplió lo comprometido con el vecino.' : 'Se coordinó con el área de apoyo.' });
  return {
    id: i + 1, solicitante, origen: elegir(ORIGENES), territorio: elegir(TERRITORIOS), delegacion, responsable,
    area_apoyo: elegir(AREAS), fecha_compromiso, estado, observaciones: '', creado_por: responsable,
    fecha_realizado: estado === 'realizado' ? dia(Math.min(offset + ([2, 11].includes(i) ? 3 : -1), 0)) : null,
    historial, version: 1,
  };
});

// ---------- Atención social ----------
const casos = [
  ['Rosa Elena Tapia', 3, [['orientacion', 'Se orientó sobre bono invierno'], ['derivacion', 'Derivada a DIDECO'], ['entrega_beneficio', 'Recibió canasta familiar']]],
  ['Luis Alberto Carvajal', 1, [['orientacion', 'Postulación a pensión garantizada']]],
  ['Carmen Gutiérrez Soto', 9, [['derivacion', 'Derivado a CESFAM'], ['seguimiento', 'Asistió a control']]],
  ['Hernán Pérez Ávila', 10, []],
  ['Gloria Fernández Rojo', 14, [['entrega_beneficio', 'Entrega de pañales adulto']]],
  ['Manuel Rivera Cortés', 7, [['orientacion', 'Subsidio de agua potable'], ['seguimiento', 'Documentación completa']]],
].map(([nombre_persona, responsable, gs], i) => {
  const r = usuarios.find((u) => u.id === responsable);
  return {
    id: i + 1, nombre_persona, rut: `${entre(6, 20)}.${entre(100, 999)}.${entre(100, 999)}-${entre(0, 9)}`,
    delegacion: r.delegacion, responsable,
    gestiones: gs.map(([tipo, resultado], k) => ({ id: i * 10 + k + 1, etapa: k + 1, tipo, resultado, fecha: dia(-(gs.length - k) * 12), funcionario_nombre: `${r.first_name} ${r.last_name}` })),
    version: 1,
  };
});

// ---------- Comentarios, auditoría y actividad de cuenta ----------
const comentarios = [
  { id: 1, entidad: 'actividad', objeto_id: actividades[1].id, autor_nombre: 'Daniela Castillo', fecha: `${dia(-2)} 10:14`, texto: 'Por favor adjunta una foto donde se vea el número de la casa.' },
  { id: 2, entidad: 'actividad', objeto_id: actividades[1].id, autor_nombre: 'Javier Araya', fecha: `${dia(-1)} 16:40`, texto: 'Mañana vuelvo al sector y saco la foto.' },
  { id: 3, entidad: 'compromiso', objeto_id: 1, autor_nombre: 'María José Pizarro', fecha: `${dia(-5)} 09:02`, texto: 'Obras confirmó cuadrilla para la próxima semana.' },
];

const EVENTOS_AUD = [
  ['login', true, 'Usuario', null], ['creacion', true, 'Actividad', { descripcion: 'Visita domiciliaria a adulto mayor', estado: 'pendiente' }],
  ['modificacion', true, 'Compromiso', [{ estado: 'pendiente' }, { estado: 'en_proceso' }]], ['validacion', true, 'Validacion', { decision: 'aprobado' }],
  ['login_fallido', false, 'Usuario', null], ['modificacion', true, 'MetaIndicador', [{ ponderador: '30.00' }, { ponderador: '40.00' }]],
  ['acceso_denegado', false, 'Auditoria', null], ['cierre', true, 'Periodo', [{ estado: 'abierto' }, { estado: 'cerrado' }]],
  ['descarga', true, 'Informe', null], ['creacion', true, 'CasoSocial', { delegacion: 'Centro' }], ['modificacion', true, 'Usuario', [{ estado: 'activo' }, { estado: 'inactivo' }]],
];
const auditoria = Array.from({ length: 30 }, (_, i) => {
  const [evento, exito, entidad, cambio] = elegir(EVENTOS_AUD);
  const u = elegir(usuarios.slice(0, 12));
  return {
    id: 30 - i, fecha: `${dia(-Math.floor(i / 3))} ${hora()}`, usuario_nombre: `${u.first_name} ${u.last_name}`, evento, exito, entidad,
    identificador: String(entre(1, 80)),
    valor_anterior: Array.isArray(cambio) ? JSON.stringify(cambio[0]) : '',
    valor_nuevo: Array.isArray(cambio) ? JSON.stringify(cambio[1]) : cambio ? JSON.stringify(cambio) : (evento === 'descarga' ? 'actividades.csv' : ''),
    ip: `10.20.${entre(1, 9)}.${entre(10, 250)}`,
  };
});

const actividadCuenta = [
  ['login', true, 0, ''], ['pii_lectura', true, -1, 'campo=rut'], ['login', true, -1, ''], ['login_fallido', false, -2, ''],
  ['password_cambio', true, -20, ''], ['login', true, -3, ''], ['logout', true, -3, ''], ['pii_modificacion', true, -30, 'campos=telefono'],
].map(([evento, exito, d, detalle], i) => ({ id: i + 1, evento, exito, fecha: `${dia(d)} ${hora()}`, ip: '10.20.3.41', detalle }));

export const db = {
  periodos, delegaciones, cargos, items, catalogo, grupos, usuarios, metas, ajustes, actividades,
  compromisos, casos, comentarios, auditoria, actividadCuenta, alertasRevisadas: new Set(), archivos: {},
};
export const ESTADOS_COMPROMISO = ESTADOS_AGENDA;
