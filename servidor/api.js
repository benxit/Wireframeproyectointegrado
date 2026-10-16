/**
 * Servidor de datos local del SGR: responde /api/* desde memoria, con la misma forma que la API institucional.
 * Se integra a Vite y funciona con `npm run dev` y `npm run preview`.
 */
import { db, dia, diasEntre, ahora, ESTADOS_COMPROMISO } from './datos.js';

const n2 = (x) => (Math.round(Number(x) * 100) / 100).toFixed(2);
const porId = (l, id) => l.find((x) => String(x.id) === String(id));
const nombre = (u) => (u ? `${u.first_name} ${u.last_name}`.trim() || u.username : '');
const nombreUsuario = (id) => nombre(porId(db.usuarios, id));
const enmascarar = {
  rut: (v) => (v ? `**.***.${v.slice(-5)}` : ''),
  email: (v) => (v ? `${v[0]}***@${v.split('@')[1]}` : ''),
  telefono: (v) => (v ? `+56 9 **** ${v.slice(-4)}` : ''),
};
const NUM = ['delegacion', 'cargo', 'item', 'funcionario', 'periodo', 'responsable', 'padre', 'servicio', 'caso'];
const BOOL = ['vigente', 'activo'];

// ---------- Vistas: agregan los campos calculados que entrega el backend real ----------
function vistaUsuario(u) {
  const { rut, email, telefono, password, roles_ids, ...resto } = u;
  return {
    ...resto, nombre_completo: nombre(u),
    cargo_nombre: porId(db.cargos, u.cargo)?.nombre || null,
    delegacion_nombre: porId(db.delegaciones, u.delegacion)?.nombre || null,
    rut_masked: enmascarar.rut(rut), email_masked: enmascarar.email(email), telefono_masked: enmascarar.telefono(telefono),
  };
}

function vistaCompromiso(c) {
  const h = dia(0);
  const abierto = c.estado !== 'realizado';
  const vencido = abierto && c.fecha_compromiso < h;
  return {
    ...c, estado_nombre: ESTADOS_COMPROMISO[c.estado], vencido,
    por_vencer: abierto && !vencido && c.fecha_compromiso <= dia(3),
    fuera_de_plazo: !abierto && !!c.fecha_realizado && c.fecha_realizado > c.fecha_compromiso,
    delegacion_nombre: porId(db.delegaciones, c.delegacion)?.nombre, responsable_nombre: nombreUsuario(c.responsable),
  };
}

const ESTADO_ACT = { pendiente: 'Pendiente', correccion: 'Requiere corrección', aprobado: 'Aprobado', rechazado: 'Rechazado' };
const TIPO_CAT = { actividad: 'Actividad', servicio: 'Servicio', atencion: 'Atención', subatencion: 'Subatención' };
const TIPO_AJUSTE = { felicitacion: 'Felicitación', reclamo: 'Reclamo', otro: 'Otro' };

const VISTAS = {
  usuarios: vistaUsuario,
  compromisos: vistaCompromiso,
  items: (i) => ({ ...i, cargo_nombre: porId(db.cargos, i.cargo)?.nombre }),
  catalogo: (c) => ({ ...c, tipo_nombre: TIPO_CAT[c.tipo] || c.tipo, padre_nombre: porId(db.catalogo, c.padre)?.nombre || null }),
  periodos: (p) => ({ ...p, dias_computables: p.fecha_inicio && p.fecha_termino ? diasEntre(p.fecha_inicio, p.fecha_termino) : 0 }),
  metas: (m) => {
    const p = porId(db.periodos, m.periodo);
    const { _avance, ...resto } = m;
    return { ...resto, item_nombre: porId(db.items, m.item)?.nombre, funcionario_nombre: nombreUsuario(m.funcionario), periodo_nombre: p?.nombre, periodo_estado: p?.estado };
  },
  ajustes: (a) => {
    const p = porId(db.periodos, a.periodo);
    return { ...a, funcionario_nombre: nombreUsuario(a.funcionario), periodo_nombre: p?.nombre, periodo_estado: p?.estado, tipo_nombre: TIPO_AJUSTE[a.tipo], responsable_nombre: nombreUsuario(a.responsable) };
  },
  actividades: (a) => ({
    ...a, estado_nombre: ESTADO_ACT[a.estado], funcionario_nombre: nombreUsuario(a.funcionario),
    item_nombre: porId(db.items, a.item)?.nombre, servicio_nombre: porId(db.catalogo, a.servicio)?.nombre || null,
    periodo_estado: porId(db.periodos, a.periodo)?.estado, ultima_validacion: a.validaciones.at(-1) || null,
  }),
  'casos-sociales': (c) => {
    const { rut, ...resto } = c;
    return { ...resto, identificador_enmascarado: enmascarar.rut(rut), delegacion_nombre: porId(db.delegaciones, c.delegacion)?.nombre, responsable_nombre: nombreUsuario(c.responsable), cantidad_gestiones: c.gestiones.length };
  },
};

const COLECCIONES = {
  delegaciones: () => db.delegaciones, cargos: () => db.cargos, items: () => db.items, catalogo: () => db.catalogo,
  periodos: () => db.periodos, metas: () => db.metas, ajustes: () => db.ajustes, usuarios: () => db.usuarios,
  actividades: () => db.actividades, compromisos: () => db.compromisos, 'casos-sociales': () => db.casos,
  grupos: () => db.grupos, auditoria: () => db.auditoria,
};
const ver = (col, o) => (VISTAS[col] ? VISTAS[col](o) : { ...o });

/** Filtros: los parámetros que coinciden con un campo se comparan por igualdad; algunos tienen reglas propias. */
function filtrar(lista, query) {
  let l = lista;
  for (const [k, v] of query) {
    if (v === '') continue;
    if (k === 'desde') l = l.filter((o) => (o.fecha || o.fecha_compromiso || '').slice(0, 10) >= v);
    else if (k === 'hasta') l = l.filter((o) => (o.fecha || o.fecha_compromiso || '').slice(0, 10) <= v);
    else if (k === 'codigo') l = l.filter((o) => o.codigo_evidencia?.toLowerCase().includes(v.toLowerCase()) ?? true);
    else if (k === 'evento') l = l.filter((o) => o.evento.includes(v));
    else if (k === 'territorio') l = l.filter((o) => (o.territorio || '').toLowerCase().includes(v.toLowerCase()));
    else if (k === 'buscar') l = l.filter((o) => (o.rut || '').replace(/\D/g, '').includes(v.replace(/\D/g, '')));
    else if (l.length && k in l[0]) l = l.filter((o) => String(o[k]) === v);
  }
  return l;
}

function normalizar(body) {
  const o = { ...body };
  for (const k of NUM) if (k in o) o[k] = o[k] === '' || o[k] == null ? null : Number(o[k]);
  for (const k of BOOL) if (k in o && typeof o[k] === 'string') o[k] = o[k] === 'true';
  delete o.id;
  return o;
}
const sigId = (l) => Math.max(0, ...l.map((x) => x.id)) + 1;

// ---------- Cálculos de tableros (misma forma que el backend) ----------
function semaforo(valor, esperado, ambar) {
  if (esperado <= 0) return 'verde';
  const r = (valor / esperado) * 100;
  return r >= 100 ? 'verde' : r >= ambar ? 'ambar' : 'rojo';
}

function resumenCompromisos(lista) {
  const v = lista.map(vistaCompromiso);
  const total = v.length;
  const realizados = v.filter((c) => c.estado === 'realizado').length;
  return {
    total, realizados, vencidos: v.filter((c) => c.vencido).length, fuera_de_plazo: v.filter((c) => c.fuera_de_plazo).length,
    porcentaje_realizado: n2(total ? (realizados / total) * 100 : 0),
  };
}

function tableroPersonal(funcionarioId, periodoId) {
  const u = porId(db.usuarios, funcionarioId);
  const p = porId(db.periodos, periodoId);
  if (!u || !p) return null;
  const h = dia(0);
  const total = diasEntre(p.fecha_inicio, p.fecha_termino);
  const trans = p.estado === 'cerrado' || h > p.fecha_termino ? total : Math.max(0, Math.min(total, diasEntre(p.fecha_inicio, h)));
  const esperado = (trans / total) * 100;
  const acts = db.actividades.filter((a) => a.funcionario === u.id && a.periodo === p.id);

  const indicadores = db.metas.filter((m) => m.funcionario === u.id && m.periodo === p.id).map((m) => {
    const it = porId(db.items, m.item);
    const avance = m._avance + acts.filter((a) => a.item === m.item && a.estado === 'aprobado').length;
    const pct = (avance / Number(m.valor_objetivo)) * 100;
    const computable = Math.min(pct, Number(m.tope_cumplimiento));
    return {
      meta_id: m.id, item: it?.nombre, unidad: it?.unidad, valor_objetivo: m.valor_objetivo, avance_actual: n2(avance),
      porcentaje_cumplimiento: n2(pct), porcentaje_computable: n2(computable), tope_cumplimiento: m.tope_cumplimiento,
      ponderador: m.ponderador, cumplimiento_ponderado: n2((computable * Number(m.ponderador)) / 100),
      meta_esperada_al_dia: n2(esperado), diferencia: n2(computable - esperado),
      semaforo: semaforo(computable, esperado, p.umbral_ambar), cumplida: pct >= 100,
    };
  });
  const ponderacion = indicadores.reduce((s, i) => s + Number(i.ponderador), 0);
  const resultado = indicadores.reduce((s, i) => s + Number(i.cumplimiento_ponderado), 0);
  const ajustes = db.ajustes.filter((a) => a.funcionario === u.id && a.periodo === p.id).reduce((s, a) => s + Number(a.valor), 0);
  const ultimo = acts.map((a) => a.fecha).sort().at(-1) || null;
  const diasSin = ultimo ? diasEntre(ultimo, h) - 1 : null;
  const cuenta = (e) => acts.filter((a) => a.estado === e).length;
  const comp = db.compromisos.filter((c) => c.responsable === u.id && c.fecha_compromiso >= p.fecha_inicio && c.fecha_compromiso <= p.fecha_termino);

  return {
    funcionario_id: u.id, funcionario: nombre(u), cargo: porId(db.cargos, u.cargo)?.nombre || null,
    periodo: p.nombre, fecha_inicio: p.fecha_inicio, fecha_termino: p.fecha_termino, fecha_calculo: h,
    dias_totales: total, dias_transcurridos: trans, meta_esperada_al_dia: n2(esperado),
    indicadores, ponderacion_total: n2(ponderacion), ponderacion_valida: Math.abs(ponderacion - 100) < 0.01,
    resultado_ponderado_total: n2(resultado), ajustes_total: n2(ajustes), resultado_final: n2(resultado + ajustes),
    semaforo: indicadores.length ? semaforo(resultado, esperado, p.umbral_ambar) : 'sin_metas',
    actividad_reciente: {
      ultimo_registro: ultimo, dias_sin_registro: diasSin, cantidad_registros: acts.length,
      promedio_diario: n2(trans ? acts.length / trans : 0), sin_actividad_reciente: diasSin === null || diasSin > 7,
    },
    evidencias: { aprobadas: cuenta('aprobado'), pendientes: cuenta('pendiente'), correccion: cuenta('correccion'), rechazadas: cuenta('rechazado'), sin_evidencia: acts.filter((a) => !a.evidencia).length },
    compromisos: resumenCompromisos(comp),
  };
}

function tableroDelegacion(delegacionId, periodoId) {
  const p = porId(db.periodos, periodoId);
  const d = porId(db.delegaciones, delegacionId);
  if (!p || !d) return null;
  const funcionarios = db.usuarios.filter((u) => u.delegacion === d.id && u.estado === 'activo').map((u) => tableroPersonal(u.id, p.id));
  const conMetas = funcionarios.filter((f) => f.indicadores.length);
  const global = conMetas.length ? conMetas.reduce((s, f) => s + Number(f.resultado_ponderado_total), 0) / conMetas.length : 0;
  const esperado = Number(funcionarios[0]?.meta_esperada_al_dia ?? 0);
  const agenda = resumenCompromisos(db.compromisos.filter((c) => c.delegacion === d.id && c.fecha_compromiso >= p.fecha_inicio && c.fecha_compromiso <= p.fecha_termino));
  return {
    delegacion: d.nombre, periodo: p.nombre, resultado_global: n2(global), meta_esperada_al_dia: n2(esperado),
    semaforo_global: conMetas.length ? semaforo(global, esperado, p.umbral_ambar) : 'sin_metas',
    total_aprobadas: db.actividades.filter((a) => a.delegacion === d.id && a.periodo === p.id && a.estado === 'aprobado').length,
    agenda, umbral_colectivo: p.umbral_colectivo, agenda_cumple_umbral: Number(agenda.porcentaje_realizado) >= p.umbral_colectivo,
    funcionarios,
  };
}

function tableroCargos(delegacionId, periodoId) {
  const t = tableroDelegacion(delegacionId, periodoId);
  if (!t) return [];
  const grupos = {};
  for (const f of t.funcionarios.filter((x) => x.cargo)) (grupos[f.cargo] ||= []).push(f);
  return Object.entries(grupos).map(([cargo, fs]) => ({
    cargo, funcionarios: fs.length, aprobadas: fs.reduce((s, f) => s + f.evidencias.aprobadas, 0),
    promedio_ponderado: n2(fs.reduce((s, f) => s + Number(f.resultado_ponderado_total), 0) / fs.length),
    detalle: fs.map((f) => ({ funcionario_id: f.funcionario_id, funcionario: f.funcionario, resultado_ponderado_total: f.resultado_ponderado_total, semaforo: f.semaforo })),
  }));
}

function alertas() {
  const l = [];
  for (const c of db.compromisos.map(vistaCompromiso)) {
    if (c.vencido) l.push({ clave: `cv-${c.id}`, tipo: 'compromiso_vencido', nivel: 'alta', fecha: c.fecha_compromiso, responsable: c.responsable_nombre, motivo: `Compromiso con ${c.solicitante} venció el ${c.fecha_compromiso}.`, enlace: `/agenda?compromiso=${c.id}` });
    else if (c.por_vencer) l.push({ clave: `cp-${c.id}`, tipo: 'compromiso_por_vencer', nivel: 'media', fecha: c.fecha_compromiso, responsable: c.responsable_nombre, motivo: `Compromiso con ${c.solicitante} vence el ${c.fecha_compromiso}.`, enlace: `/agenda?compromiso=${c.id}` });
  }
  for (const a of db.actividades.filter((x) => porId(db.periodos, x.periodo)?.estado === 'abierto')) {
    if (a.estado === 'pendiente' && a.evidencia) l.push({ clave: `ep-${a.id}`, tipo: 'evidencia_pendiente', nivel: 'media', fecha: a.fecha, responsable: 'Daniela Castillo', motivo: `La actividad ${a.codigo_evidencia} tiene evidencia sin revisar.`, enlace: `/actividades?codigo=${a.codigo_evidencia}` });
    if (a.estado === 'correccion') l.push({ clave: `ec-${a.id}`, tipo: 'evidencia_requiere_accion', nivel: 'alta', fecha: a.fecha, responsable: nombreUsuario(a.funcionario), motivo: `La actividad ${a.codigo_evidencia} requiere corrección.`, enlace: `/actividades?codigo=${a.codigo_evidencia}` });
  }
  l.push({ clave: 'sr-19', tipo: 'sin_registros', nivel: 'media', fecha: dia(-1), responsable: 'Antonia Cortés', motivo: 'Antonia Cortés lleva más de 7 días sin registrar actividades.', enlace: '/tablero-personal?funcionario=18' });
  l.push({ clave: 'au-12', tipo: 'avance_bajo_umbral', nivel: 'alta', fecha: dia(0), responsable: 'Tomás Herrera', motivo: 'El avance de Tomás Herrera está bajo el umbral ámbar del periodo.', enlace: '/tablero-personal?funcionario=12' });
  return l.sort((a, b) => b.fecha.localeCompare(a.fecha)).map((a) => ({ ...a, revisada: db.alertasRevisadas.has(a.clave) }));
}

const csv = (filas) => filas.map((f) => f.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(';')).join('\r\n');

/** PDF de una página con líneas de texto (Helvetica, WinAnsi para tildes y eñes). */
function comprobantePdf(lineas) {
  const esc = (s) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const texto = lineas.map((l, i) => `BT /F1 ${i < 2 ? 14 : 11} Tf 60 ${780 - i * 22} Td (${esc(l)}) Tj ET`).join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(texto, 'latin1')} >>\nstream\n${texto}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objs.map((o, i) => { const pos = Buffer.byteLength(pdf, 'latin1'); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; return pos; });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

// ---------- Utilidades HTTP ----------
function leerCuerpo(req) {
  return new Promise((ok) => {
    const partes = [];
    req.on('data', (c) => partes.push(c));
    req.on('end', () => ok(Buffer.concat(partes)));
  });
}

/** Extrae el primer archivo de un multipart/form-data (avatar o evidencia). */
function archivoMultipart(buf, ct = '') {
  const m = /boundary=([^;]+)/.exec(ct);
  if (!m) return null;
  const limite = Buffer.from(`--${m[1]}`);
  const ini = buf.indexOf(limite);
  const finCab = buf.indexOf('\r\n\r\n', ini);
  if (ini < 0 || finCab < 0) return null;
  const cab = buf.slice(ini, finCab).toString();
  const fin = buf.indexOf(Buffer.from(`\r\n--${m[1]}`), finCab);
  return {
    nombre: /filename="([^"]*)"/.exec(cab)?.[1] || 'archivo',
    tipo: /Content-Type:\s*([^\r\n]+)/i.exec(cab)?.[1] || 'application/octet-stream',
    datos: buf.slice(finCab + 4, fin < 0 ? undefined : fin),
  };
}

const cookie = (req, n) => (req.headers.cookie || '').split('; ').find((c) => c.startsWith(`${n}=`))?.split('=')[1];

function responder(res, status, data, cabeceras = {}) {
  if (status === 204) { res.writeHead(204, cabeceras); res.end(); return; }
  const esTexto = Buffer.isBuffer(data) || typeof data === 'string';
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...cabeceras });
  res.end(esTexto ? data : JSON.stringify(data));
}


// ---------- Rutas ----------
async function manejar(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const ruta = url.pathname.replace(/^\/api/, '');
  const seg = ruta.split('/').filter(Boolean);
  const metodo = req.method;
  const crudo = metodo === 'GET' ? Buffer.alloc(0) : await leerCuerpo(req);
  const ct = req.headers['content-type'] || '';
  let body = {};
  if (ct.includes('application/json') && crudo.length) { try { body = JSON.parse(crudo.toString()); } catch { body = {}; } }
  const yo = porId(db.usuarios, cookie(req, 'sgr_sesion'));
  const ok = (data, status = 200, cab) => responder(res, status, data, cab);
  const error = (status, detail, extra = {}) => responder(res, status, { detail, ...extra });
  const q = url.searchParams;


  // --- Autenticación ---
  if (ruta === '/auth/estado/') return ok({ ok: true });
  if (ruta === '/auth/me/') return yo ? ok(vistaUsuario(yo)) : error(401, 'No autenticado.');
  if (ruta === '/auth/login/' && metodo === 'POST') {
    const nom = String(body.username || '').trim().toLowerCase();
    const u = db.usuarios.find((x) => x.username === nom);
    if (!u || !body.password) return error(400, 'Usuario o contraseña incorrectos.');
    if (u.estado !== 'activo') return error(400, 'La cuenta está inactiva.');
    if (u.mfa_activo) return ok({ mfa_requerido: true, ticket: `t-${u.id}` });
    u.last_login = ahora();
    return ok({ usuario: vistaUsuario(u) }, 200, { 'Set-Cookie': `sgr_sesion=${u.id}; Path=/; SameSite=Lax` });
  }
  if (ruta === '/auth/login/mfa/' && metodo === 'POST') {
    const u = porId(db.usuarios, String(body.ticket || '').slice(2));
    if (!u) return error(400, 'El ingreso expiró, vuelve a intentarlo.');
    return ok({ usuario: vistaUsuario(u) }, 200, { 'Set-Cookie': `sgr_sesion=${u.id}; Path=/; SameSite=Lax` });
  }
  if (ruta === '/auth/logout/') return ok({ ok: true }, 200, { 'Set-Cookie': 'sgr_sesion=; Path=/; Max-Age=0' });
  if (ruta === '/auth/refresh/') return yo ? ok({ ok: true }) : error(401, 'Sesión expirada.');
  if (ruta.startsWith('/auth/password/')) return ok({ detail: 'Listo.' });

  if (!yo) return error(401, 'No autenticado.');

  // --- Cuenta propia ---
  if (seg[0] === 'cuenta') {
    const accion = seg.slice(1).join('/');
    if (accion === 'revelar') return ok({ valor: yo[body.campo] || '—', ttl: 30 });
    if (accion === 'perfil') { Object.assign(yo, Object.fromEntries(Object.entries(body).filter(([k]) => ['first_name', 'last_name', 'email', 'telefono'].includes(k)))); return ok(vistaUsuario(yo)); }
    if (accion === 'reautenticar') return ok({ ok: true });
    if (accion === 'actividad') return ok(db.actividadCuenta);
    if (accion === 'cerrar-sesiones') return ok({ ok: true });
    if (accion === 'mfa/iniciar') return ok({ secreto: 'JBSWY3DPEHPK3PXP', uri: `otpauth://totp/SGR%20La%20Serena:${yo.username}?secret=JBSWY3DPEHPK3PXP&issuer=SGR%20La%20Serena` });
    if (accion === 'mfa/activar') {
      yo.mfa_activo = true; yo.codigos_restantes = 10;
      return ok({ codigos: Array.from({ length: 10 }, (_, i) => `${(4821 + i * 977) % 10000}`.padStart(4, '0') + '-' + `${(1307 + i * 613) % 10000}`.padStart(4, '0')) });
    }
    if (accion === 'mfa/desactivar') { yo.mfa_activo = false; yo.codigos_restantes = 0; return ok({ ok: true }); }
    if (accion === 'avatar') {
      if (metodo === 'DELETE') { yo.avatar = null; return ok({ ok: true }); }
      const f = archivoMultipart(crudo, ct);
      if (f) yo.avatar = `data:${f.tipo};base64,${f.datos.toString('base64')}`;
      return ok(vistaUsuario(yo));
    }
  }

  // --- Rutas especiales ---
  if (ruta === '/alertas/') {
    if (metodo === 'POST') { db.alertasRevisadas.add(body.clave); return ok({ ok: true }); }
    return ok(alertas());
  }
  if (ruta === '/comentarios/') {
    if (metodo === 'POST') {
      const c = { id: sigId(db.comentarios), entidad: body.entidad, objeto_id: Number(body.objeto_id), autor_nombre: nombre(yo), fecha: ahora(), texto: body.texto };
      db.comentarios.push(c);
      return ok(c, 201);
    }
    return ok(db.comentarios.filter((c) => c.entidad === q.get('entidad') && String(c.objeto_id) === q.get('objeto')));
  }
  if (ruta === '/gestiones-sociales/' && metodo === 'POST') {
    const caso = porId(db.casos, body.caso);
    if (!caso) return error(400, 'Caso no encontrado.');
    if (caso.gestiones.length >= 3) return responder(res, 400, { caso: ['El caso ya tiene 3 gestiones (RN-012).'] });
    const g = { id: Date.now(), etapa: caso.gestiones.length + 1, tipo: body.tipo, fecha: body.fecha, resultado: body.resultado || '', funcionario_nombre: nombre(yo) };
    caso.gestiones.push(g);
    return ok(g, 201);
  }
  if (ruta === '/compromisos/resumen/') {
    const l = filtrar(db.compromisos.map(vistaCompromiso), q);
    const porResp = {};
    for (const c of l) (porResp[c.responsable] ||= []).push(c);
    return ok({
      total: resumenCompromisos(l),
      por_funcionario: Object.entries(porResp).map(([id, cs]) => ({ responsable_id: Number(id), responsable: nombreUsuario(id), ...resumenCompromisos(cs) })),
    });
  }
  if (ruta === '/metas/ponderaciones/') {
    const porFunc = {};
    for (const m of db.metas.filter((x) => String(x.periodo) === q.get('periodo'))) (porFunc[m.funcionario] ||= []).push(m);
    return ok(Object.entries(porFunc).map(([id, ms]) => {
      const total = ms.reduce((s, m) => s + Number(m.ponderador), 0);
      return { funcionario_id: Number(id), funcionario: nombreUsuario(id), metas: ms.length, ponderacion_total: n2(total), valida: Math.abs(total - 100) < 0.01 };
    }));
  }
  if (ruta === '/tablero/personal/') { const t = tableroPersonal(q.get('funcionario'), q.get('periodo')); return t ? ok(t) : error(404, 'Sin datos.'); }
  if (ruta === '/tablero/delegacion/') { const t = tableroDelegacion(q.get('delegacion'), q.get('periodo')); return t ? ok(t) : error(404, 'Sin datos.'); }
  if (ruta === '/tablero/cargos/') return ok(tableroCargos(q.get('delegacion'), q.get('periodo')));

  if (seg[0] === 'informes') {
    let filas = [['Sin datos']];
    if (seg[1] === 'actividades.csv') filas = [['Código', 'Fecha', 'Funcionario', 'Ítem', 'Descripción', 'Estado'], ...filtrar(db.actividades.map(VISTAS.actividades), q).map((a) => [a.codigo_evidencia, a.fecha, a.funcionario_nombre, a.item_nombre, a.descripcion, a.estado_nombre])];
    if (seg[1] === 'compromisos.csv') filas = [['Solicitante', 'Delegación', 'Responsable', 'Fecha', 'Estado'], ...filtrar(db.compromisos.map(vistaCompromiso), q).map((c) => [c.solicitante, c.delegacion_nombre, c.responsable_nombre, c.fecha_compromiso, c.estado_nombre])];
    if (seg[1] === 'tablero-delegacion.csv') {
      const t = tableroDelegacion(q.get('delegacion'), q.get('periodo'));
      filas = [['Funcionario', 'Cargo', 'Resultado ponderado', 'Semáforo'], ...(t?.funcionarios || []).map((f) => [f.funcionario, f.cargo, f.resultado_ponderado_total, f.semaforo])];
    }
    return ok(`﻿${csv(filas)}`, 200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${seg[1]}"` });
  }

  // Acciones sobre un registro: /coleccion/:id/accion/
  if (seg.length === 3) {
    const [col, id, accion] = seg;
    if (col === 'periodos') {
      const p = porId(db.periodos, id);
      if (accion === 'cerrar') { p.estado = 'cerrado'; p.version++; return ok(VISTAS.periodos(p)); }
      if (accion === 'reabrir') { p.estado = 'abierto'; p.version++; return ok(VISTAS.periodos(p)); }
    }
    if (col === 'actividades') {
      const a = porId(db.actividades, id);
      if (accion === 'validar') {
        a.estado = body.decision;
        a.validaciones.push({ decision: body.decision, fecha: ahora(), verificador_nombre: nombre(yo), observacion: body.observacion || '' });
        return ok(VISTAS.actividades(a));
      }
      if (accion === 'subir_evidencia') {
        const f = archivoMultipart(crudo, ct);
        a.evidencia = { nombre_original: f?.nombre || 'evidencia' };
        if (f) db.archivos[a.id] = f;
        if (a.estado !== 'aprobado') a.estado = 'pendiente';
        return ok(VISTAS.actividades(a));
      }
      if (accion === 'evidencia') {
        const f = db.archivos[a.id];
        if (f) return ok(f.datos, 200, { 'Content-Type': f.tipo, 'Content-Disposition': `attachment; filename="${f.nombre}"` });
        const v = VISTAS.actividades(a);
        const pdf = comprobantePdf([
          'Municipalidad de La Serena - SGR', `Comprobante de evidencia ${a.codigo_evidencia}`, '',
          `Fecha: ${a.fecha}`, `Funcionario: ${v.funcionario_nombre}`, `Item: ${v.item_nombre}`,
          `Actividad: ${a.descripcion}`, `Archivo original: ${a.evidencia?.nombre_original || '-'}`,
        ]);
        return ok(pdf, 200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${a.codigo_evidencia}.pdf"` });
      }
    }
    if (col === 'compromisos' && accion === 'cambiar_estado') {
      const c = porId(db.compromisos, id);
      c.historial.push({ tipo_nombre: 'Estado', valor_anterior: ESTADOS_COMPROMISO[c.estado], valor_nuevo: ESTADOS_COMPROMISO[body.estado], fecha: ahora(), autor_nombre: nombre(yo), observacion: body.observaciones || '' });
      c.estado = body.estado;
      c.fecha_realizado = body.estado === 'realizado' ? dia(0) : null;
      c.version++;
      return ok(vistaCompromiso(c));
    }
  }

  // --- CRUD genérico ---
  const fuente = COLECCIONES[seg[0]];
  if (!fuente) return error(404, 'Recurso no encontrado.');
  const col = seg[0];
  const lista = fuente();

  if (seg.length === 1) {
    if (metodo === 'GET') return ok(filtrar(lista.map((o) => ver(col, o)), q));
    if (metodo === 'POST') {
      const o = { id: sigId(lista), version: 1, ...normalizar(body) };
      if (col === 'usuarios') {
        o.roles = db.grupos.filter((g) => (body.roles_ids || []).includes(g.id)).map((g) => g.name);
        Object.assign(o, { estado: o.estado || 'activo', avatar: null, mfa_activo: false, codigos_restantes: 0, last_login: null, date_joined: ahora(), password_actualizada: ahora() });
      }
      if (col === 'periodos') Object.assign(o, { estado: 'abierto', umbral_colectivo: Number(o.umbral_colectivo || 80), umbral_ambar: Number(o.umbral_ambar || 70) });
      if (col === 'items' && !('vigente' in o)) o.vigente = true;
      if (col === 'catalogo' && !('activo' in o)) o.activo = true;
      if (col === 'metas') Object.assign(o, { _avance: 0, tope_cumplimiento: Number(o.tope_cumplimiento || 120), valor_objetivo: n2(o.valor_objetivo), ponderador: n2(o.ponderador) });
      if (col === 'ajustes') Object.assign(o, { responsable: yo.id, valor: n2(o.valor) });
      if (col === 'actividades') {
        Object.assign(o, { funcionario: yo.id, delegacion: yo.delegacion, estado: 'pendiente', validaciones: [], evidencia: null, codigo_evidencia: `SGR-${dia(0).slice(0, 4)}-${String(o.id).padStart(5, '0')}` });
        lista.unshift(o);
        return ok(ver(col, o), 201);
      }
      if (col === 'compromisos') Object.assign(o, { estado: 'ingresado', creado_por: yo.id, fecha_realizado: null, historial: [{ tipo_nombre: 'Creación', valor_anterior: '', valor_nuevo: 'Ingresado', fecha: ahora(), autor_nombre: nombre(yo), observacion: '' }] });
      if (col === 'casos-sociales') {
        Object.assign(o, { rut: body.identificador_persona, responsable: yo.id, gestiones: [] });
        delete o.identificador_persona;
      }
      lista.push(o);
      return ok(ver(col, o), 201);
    }
  }

  if (seg.length === 2) {
    const o = porId(lista, seg[1]);
    if (!o) return error(404, 'No encontrado.');
    if (metodo === 'GET') return ok(ver(col, o));
    if (metodo === 'DELETE') { lista.splice(lista.indexOf(o), 1); return ok(null, 204); }
    if (metodo === 'PATCH' || metodo === 'PUT') {
      const cambios = normalizar(body);
      // Se descartan los campos calculados que el formulario reenvía tal cual los recibió.
      for (const k of Object.keys(cambios)) if (!(k in o) || k === 'version') delete cambios[k];
      if (col === 'usuarios') {
        if (body.roles_ids) o.roles = db.grupos.filter((g) => body.roles_ids.includes(g.id)).map((g) => g.name);
        for (const k of ['rut', 'email', 'telefono']) if (body[k]) o[k] = body[k];
      }
      if (col === 'compromisos' && body.motivo) {
        o.historial.push({ tipo_nombre: 'Reasignación', valor_anterior: nombreUsuario(o.responsable), valor_nuevo: nombreUsuario(cambios.responsable ?? o.responsable), fecha: ahora(), autor_nombre: nombre(yo), observacion: body.motivo });
      }
      Object.assign(o, cambios);
      o.version = (o.version || 1) + 1;
      return ok(ver(col, o));
    }
  }
  return error(405, 'Método no permitido.');
}

export default function apiLocal() {
  const middleware = (req, res, next) => {
    if (!req.url.startsWith('/api/')) return next();
    manejar(req, res).catch((e) => { console.error('[api]', e); responder(res, 500, { detail: 'Error interno del servidor.' }); });
  };
  return {
    name: 'sgr-api-local',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}

