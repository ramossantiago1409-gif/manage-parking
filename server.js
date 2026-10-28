'use strict';
// Manage Parking - Prototipo 4 (editor de mapa 2D)
// API REST (Express) + tiempo real (Socket.IO) + JWT por roles. Datos en memoria (db):
// para pasar a MySQL basta reemplazar `db` por consultas dentro de cada ruta.
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const crypto = require('crypto');
require('./entorno'); // lee .env en desarrollo local (en el hosting se usan las variables del panel)
const persistencia = require('./persistencia');
const { PLANTILLAS, INFO: PLANTILLAS_INFO } = require('./plantillas');

const PORT = process.env.PORT || 3000;
// Variables de entorno (ver DESPLIEGUE.md):
//   MODO_DEMO=0  → instalación real: sin cuentas ni datos de demostración (exige ADMIN_PASSWORD)
//   ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NOMBRE → cuenta del administrador · JWT_SECRET → firma de sesiones · CONJUNTO → nombre del conjunto
const DEMO = process.env.MODO_DEMO !== '0';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@torrecentral.com').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
if (!DEMO && !process.env.ADMIN_PASSWORD) { console.error('Con MODO_DEMO=0 debes definir ADMIN_PASSWORD (contraseña del administrador).'); process.exit(1); }
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) { JWT_SECRET = crypto.randomBytes(32).toString('hex'); console.warn('Aviso: JWT_SECRET no está definido; se generó uno temporal (las sesiones se cierran al reiniciar).'); }
const app = express();
app.set('trust proxy', 1); // detrás del proxy del hosting, req.ip es la IP real del cliente (límite de intentos)
const server = http.createServer(app);
const io = new Server(server); // mismo origen: no necesita CORS
app.use(cors({ origin: process.env.CORS_ORIGIN || false }));
app.use((req, res, next) => { res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' }); next(); });
app.get('/healthz', (req, res) => res.json({ ok: true })); // comprobación de salud para el hosting
app.use(express.json({ limit: '6mb' }));
// Base de datos: tras cada petición que modifica algo, se programa el guardado de lo que cambió (ver persistencia.js)
let bd = null;
app.use((req, res, next) => { if (bd && req.method !== 'GET') res.on('finish', () => bd.programar(db)); next(); });
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------------------ datos
const hash = (p) => bcrypt.hashSync(p, 8);
const db = {
  conjunto: process.env.CONJUNTO || 'Conjunto Torre Central',
  zonas: ['Sótano 1', 'Sótano 2'],
  torres: [
    { idTorre: 1, nombre: 'Torre A' },
    { idTorre: 2, nombre: 'Torre B' },
  ],
  guardias: DEMO ? [
    { id: 1, nombre: 'Carlos Ramírez', turno: '08:00–16:00' },
    { id: 2, nombre: 'Luis Torres', turno: '16:00–00:00' },
    { id: 3, nombre: 'María Peña', turno: '00:00–08:00' },
  ] : [{ id: 1, nombre: 'Guardia de turno', turno: '00:00–24:00' }],
  usuarios: [
    { id: 1, nombre: process.env.ADMIN_NOMBRE || 'Ana María Gómez', correo: ADMIN_EMAIL, telefono: DEMO ? '+57 300 000 0000' : '', rol: 'administrador', hash: hash(ADMIN_PASSWORD) },
    ...(DEMO ? [
      { id: 2, nombre: 'Carlos Ramírez', correo: 'guarda@torrecentral.com', telefono: '+57 311 000 0001', rol: 'guardia', guardiaId: 1, hash: hash('guarda123') },
      { id: 3, nombre: 'Camilo Pérez', correo: 'camilo@torrecentral.com', telefono: '+57 312 000 0002', rol: 'residente', torre: 1, apartamento: '502', placas: ['QRS-88T'], hash: hash('resi123') },
    ] : []),
  ],
  tarifas: { primeraHora: 4000, horaAdicional: 2500, fraccion: 1000 },
  cuentas: DEMO ? { 3: { saldo: 0, estado: 'Al día', detalle: 'Mensualidad sept. pagada' } } : {},
  celdas: [], mapas: {}, accesos: [], recibos: [], solicitudes: [],
  seq: { usuario: 6, celda: 1, acceso: 1, guardia: 4, recibo: 1, solicitud: 1 },
};

const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
const esHoy = (iso) => new Date(iso).toDateString() === new Date().toDateString();
const pad = (n) => String(n).padStart(2, '0');
const fechaDM = (iso) => { const d = new Date(iso); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1); };
const suma = (l) => l.reduce((s, a) => s + (a.valor || 0), 0);

function enTurno(g, h) {
  const [s, e0] = g.turno.split('–').map((x) => parseInt(x, 10));
  const e = e0 === 0 ? 24 : e0;
  return h >= s && h < e;
}
const guardiaActivo = () => db.guardias.find((g) => enTurno(g, new Date().getHours())) || db.guardias[0];

// ------------------------------------------------------------------ tarifas (RF04)
// ≤15 min: fracción · ≤60 min: primera hora · después: primera hora + tiempo adicional prorrateado
// Ej. mockup: 1 h 48 min = $4.000 + $2.000 = $6.000
function liquidar(a, fin) {
  const min = Math.max(1, Math.ceil((new Date(fin || Date.now()) - new Date(a.entrada)) / 60000));
  const t = db.tarifas;
  if (a.clase === 'residente' || a.mensualidad) return { min, primera: 0, adicional: 0, total: 0 };
  if (min <= 15) return { min, primera: t.fraccion, adicional: 0, total: t.fraccion };
  const adicional = min > 60 ? Math.round(((min - 60) / 60) * t.horaAdicional / 100) * 100 : 0;
  return { min, primera: t.primeraHora, adicional, total: t.primeraHora + adicional };
}

// ------------------------------------------------------------------ semillas
if (DEMO) db.usuarios.push(
  { id: 4, nombre: 'Luis Torres', correo: 'luis@torrecentral.com', telefono: '+57 313 000 0003', rol: 'guardia', guardiaId: 2, hash: hash('guarda123') },
  { id: 5, nombre: 'María Peña', correo: 'maria@torrecentral.com', telefono: '+57 314 000 0004', rol: 'guardia', guardiaId: 3, hash: hash('guarda123') });
// Cada zona tiene un mapa (lienzo + elementos) y sus celdas con geometría propia (x, y, w, h, rot).
function aplicarPlantilla(zona, id) {
  const t = (PLANTILLAS[id] || PLANTILLAS.vacio)();
  db.mapas[zona] = { ancho: t.ancho, alto: t.alto, elementos: t.elementos };
  t.celdas.forEach((c) => db.celdas.push({ idCelda: db.seq.celda++, zona, estado: 'libre', placa: null, propietario: null, ...c }));
}
aplicarPlantilla('Sótano 1', 'central');
aplicarPlantilla('Sótano 2', 'perimetral');
const cel = (z, n) => db.celdas.find((c) => c.zona === z && c.numero === n);
if (DEMO) [['A1', 'QRS-88T', 'Camilo Pérez'], ['A3', 'JKL-20M', 'M. Ruiz'], ['A5', 'TUV-77N', 'L. Díaz'], ['B2', 'WXY-11Q', 'S. Mora'], ['B5', 'ZAB-64R', 'P. Leal']]
  .forEach(([n, p, o]) => Object.assign(cel('Sótano 1', n), { estado: 'mensual', placa: p, propietario: o }));

function addAcceso(o) {
  const a = { id: db.seq.acceso++, tipo: 'carro', clase: 'visitante', mensualidad: false, celdaId: null, guardiaId: 1, entrada: null, salida: null, valor: null, danos: null, ...o };
  if (a.salida && a.valor == null) a.valor = liquidar(a, a.salida).total;
  db.accesos.push(a);
  return a;
}
if (DEMO) {
const ga = guardiaActivo().id;
addAcceso({ placa: 'KLM-45D', celdaId: cel('Sótano 1', 'A2').idCelda, entrada: ago(100), guardiaId: ga });
cel('Sótano 1', 'A2').estado = 'ocupada';
addAcceso({ placa: 'QRS-88T', clase: 'residente', mensualidad: true, celdaId: cel('Sótano 1', 'A1').idCelda, entrada: ago(130), guardiaId: ga });
addAcceso({ placa: 'ABC-12F', celdaId: cel('Sótano 1', 'B1').idCelda, entrada: ago(190), salida: ago(120), guardiaId: ga });
['DEF-33G', 'XYZ-90P', 'GHI-12J', 'MNO-55P', 'PQR-31S', 'STU-76V', 'BCD-48E', 'FGH-62K'].forEach((placa, i) => {
  for (let k = 0; k < 2; k++) {
    const n = i * 2 + k, dia = 1 + Math.floor(n / 3), dur = [35, 108, 145, 70, 200, 50][n % 6];
    addAcceso({ placa, tipo: n % 5 === 0 ? 'moto' : 'carro', clase: n % 4 === 3 ? 'residente' : 'visitante',
      guardiaId: db.guardias[n % 3].id, entrada: ago(dia * 1440 + n * 37), salida: ago(dia * 1440 + n * 37 - dur) });
  }
});
db.recibos.push(
  { id: db.seq.recibo++, userId: 3, residente: 'Camilo Pérez', concepto: 'Pago mensualidad agosto', valor: 120000, nombre: 'recibo_ago.pdf', archivo: null, estado: 'Revisado', fecha: ago(4000) },
  { id: db.seq.recibo++, userId: 3, residente: 'Camilo Pérez', concepto: 'Pago mensualidad septiembre', valor: 120000, nombre: 'consig_sept.pdf', archivo: null, estado: 'Pendiente', fecha: ago(600) },
  { id: db.seq.recibo++, userId: null, residente: 'M. Ruiz', concepto: 'Pago septiembre', valor: 120000, nombre: 'pago_sept.jpg', archivo: null, estado: 'Revisado', fecha: ago(900) },
  { id: db.seq.recibo++, userId: null, residente: 'S. Mora', concepto: 'Consignación', valor: 120000, nombre: 'consig.pdf', archivo: null, estado: 'Pendiente', fecha: ago(300) });
}

// ------------------------------------------------------------------ utilidades
function ser(a) {
  const c = db.celdas.find((x) => x.idCelda === a.celdaId);
  const g = db.guardias.find((x) => x.id === a.guardiaId);
  return { ...a, celda: c ? c.numero : '—', zona: c ? c.zona : '', guardia: g ? g.nombre : '—',
    estado: !a.salida ? (a.mensualidad ? 'Mensual' : 'En parqueo') : 'Pagado/Salida' };
}
const tokenUser = (u) => ({ id: u.id, nombre: u.nombre, rol: u.rol, guardiaId: u.guardiaId, torre: u.torre, apartamento: u.apartamento, placas: u.placas });
const emitir = () => io.emit('datos:actualizados');
const emitirCelda = (c) => { io.emit('celda:actualizada', c); emitir(); };
// Normaliza placas: "klm45d" -> "KLM-45D"
const normPlaca = (p) => { const x = String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return x.length === 6 ? x.slice(0, 3) + '-' + x.slice(3) : x; };
const activo = (placa) => db.accesos.find((a) => a.placa === normPlaca(placa) && !a.salida);

function auth(roles = []) {
  return (req, res, next) => {
    try {
      const p = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), JWT_SECRET);
      if (roles.length && !roles.includes(p.rol)) return res.status(403).json({ error: 'Rol sin permiso' });
      req.user = p; next();
    } catch { res.status(401).json({ error: 'Sesión inválida o vencida' }); }
  };
}
const OP = ['guardia', 'administrador'], ADM = ['administrador'], RES = ['residente'];

// ------------------------------------------------------------------ autenticación y perfil
app.post('/api/login', limitar, (req, res) => {
  const { correo, password, rol } = req.body || {};
  const u = db.usuarios.find((x) => x.correo === String(correo || '').trim().toLowerCase());
  if (!u || !bcrypt.compareSync(password || '', u.hash)) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  if (rol && u.rol !== rol) return res.status(401).json({ error: 'Este usuario no pertenece al perfil seleccionado' });
  const user = tokenUser(u);
  res.json({ token: jwt.sign(user, JWT_SECRET, { expiresIn: '8h' }), user });
});
app.get('/api/config', auth(), (req, res) => res.json({ conjunto: db.conjunto, zonas: db.zonas, torres: db.torres, tarifas: db.tarifas, guardiaActivo: guardiaActivo(), persistencia: bd ? bd.tipo : 'memoria' }));
app.get('/api/perfil', auth(), (req, res) => {
  const u = db.usuarios.find((x) => x.id === req.user.id);
  res.json({ nombre: u.nombre, correo: u.correo, telefono: u.telefono, rol: u.rol, conjunto: db.conjunto });
});
app.put('/api/perfil', auth(), (req, res) => {
  const u = db.usuarios.find((x) => x.id === req.user.id);
  const { nombre, correo, telefono, conjunto, password } = req.body || {};
  if (nombre) u.nombre = nombre;
  if (correo) u.correo = correo.toLowerCase();
  if (telefono !== undefined) u.telefono = telefono;
  if (conjunto && u.rol === 'administrador') db.conjunto = conjunto;
  if (password) { if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener mínimo 6 caracteres' }); u.hash = hash(password); }
  res.json({ ok: true, user: tokenUser(u) });
});

// Registro: SOLO residentes pueden autorregistrarse. Los administradores vienen precargados
// y los guardias los crea el administrador (POST /api/guardias).
const reCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const intentos = new Map();
function limitar(req, res, next) { // freno simple contra fuerza bruta (15 intentos por minuto y por IP)
  const n = Date.now(), l = (intentos.get(req.ip) || []).filter((t) => n - t < 60000);
  if (l.length >= 15) return res.status(429).json({ error: 'Demasiados intentos. Espera un minuto.' });
  l.push(n); intentos.set(req.ip, l); next();
}
app.get('/api/publico/modo', (req, res) => res.json({ demo: DEMO, adminDemo: DEMO && !process.env.ADMIN_PASSWORD, conjunto: db.conjunto, persistencia: bd ? bd.tipo : 'memoria' }));
app.get('/api/publico/torres', (req, res) => res.json({ conjunto: db.conjunto, torres: db.torres }));
app.post('/api/registro', limitar, (req, res) => {
  const { nombre, correo, telefono, torre, apartamento, placa, password, autorizo } = req.body || {};
  const mail = String(correo || '').trim().toLowerCase(), p = normPlaca(placa);
  const err = (m, c = 400) => res.status(c).json({ error: m });
  if (!nombre || nombre.trim().length < 3) return err('Escribe tu nombre completo');
  if (!reCorreo.test(mail)) return err('El correo no es válido');
  if (db.usuarios.some((u) => u.correo === mail)) return err('Ese correo ya está registrado', 409);
  if (!db.torres.some((t) => t.idTorre === Number(torre))) return err('Selecciona tu torre');
  if (!String(apartamento || '').trim()) return err('Indica tu apartamento');
  if (!/^[A-Z]{3}-\d{2}[A-Z0-9]$/.test(p)) return err('Placa no válida (ej. ABC-123 o ABC-12D)');
  if (db.usuarios.some((u) => (u.placas || []).includes(p))) return err('Esa placa ya está registrada', 409);
  if (String(password || '').length < 6) return err('La contraseña debe tener mínimo 6 caracteres');
  if (!autorizo) return err('Debes autorizar el tratamiento de datos personales (Ley 1581 de 2012)');
  const u = { id: db.seq.usuario++, nombre: nombre.trim(), correo: mail, telefono: telefono || '', rol: 'residente', torre: Number(torre),
    apartamento: String(apartamento).trim(), placas: [p], hash: hash(password), registrado: new Date().toISOString() };
  db.usuarios.push(u);
  db.cuentas[u.id] = { saldo: 0, estado: 'Al día', detalle: 'Cuenta nueva' };
  const user = tokenUser(u);
  res.status(201).json({ token: jwt.sign(user, JWT_SECRET, { expiresIn: '8h' }), user });
});
app.get('/api/residentes', auth(ADM), (req, res) => res.json(db.usuarios.filter((u) => u.rol === 'residente').map((u) => ({
  id: u.id, nombre: u.nombre, correo: u.correo, apartamento: u.apartamento, placas: u.placas,
  torre: (db.torres.find((t) => t.idTorre === u.torre) || {}).nombre, registrado: u.registrado || null }))));

// ------------------------------------------------------------------ celdas, mapa 2D y zonas (RF02, RF03)
const MPP = 0.05; // metros por píxel del lienzo
const TIPOS_EL = ['isla', 'planta', 'muro', 'flecha', 'cruce', 'stop', 'entrada', 'salida', 'torre', 'texto'];
const mapaOut = (zona) => { const m = db.mapas[zona]; return { zona, ancho: m.ancho, alto: m.alto, elementos: m.elementos, celdas: db.celdas.filter((c) => c.zona === zona) }; };
const enRango = (v, a, b) => Number.isFinite(Number(v)) && Number(v) >= a && Number(v) <= b;
const entero = (v) => Math.round(Number(v));

// punto de referencia para medir distancias: acceso a la torre (si está dibujado en el mapa) o la entrada
function refPunto(zona, torreId) {
  const m = db.mapas[zona];
  const el = (torreId && m.elementos.find((e) => e.tipo === 'torre' && Number(e.ref) === Number(torreId))) || m.elementos.find((e) => e.tipo === 'entrada');
  return el ? { x: el.x + el.w / 2, y: el.y + el.h / 2 } : { x: m.ancho / 2, y: m.alto };
}
app.get('/api/celdas', auth(), (req, res) => res.json(db.celdas.filter((c) => !req.query.zona || c.zona === req.query.zona)));
app.get('/api/mapa', auth(), (req, res) => {
  const z = req.query.zona || db.zonas[0];
  if (!db.mapas[z]) return res.status(404).json({ error: 'La zona no existe' });
  res.json(mapaOut(z));
});
app.get('/api/plantillas', auth(ADM), (req, res) => res.json(PLANTILLAS_INFO));
app.get('/api/celdas/sugeridas', auth(), (req, res) => {
  const zona = req.query.zona || db.zonas[0];
  if (!db.mapas[zona]) return res.status(404).json({ error: 'La zona no existe' });
  const tipo = req.query.tipo === 'moto' ? 'moto' : 'carro', ref = refPunto(zona, req.query.torre);
  res.json(db.celdas.filter((c) => c.zona === zona && c.estado === 'libre' && (c.tipo === tipo || (tipo === 'carro' && c.tipo === 'discapacidad')))
    .map((c) => ({ ...c, distancia: Math.round(Math.hypot(c.x + c.w / 2 - ref.x, c.y + c.h / 2 - ref.y) * MPP) }))
    .sort((a, b) => (a.tipo === 'discapacidad') - (b.tipo === 'discapacidad') || a.distancia - b.distancia));
});

// Guardar la estructura completa de una zona (celdas + elementos). Las celdas existentes conservan su estado.
app.put('/api/mapa', auth(ADM), (req, res) => {
  const { zona, ancho, alto, celdas = [], elementos = [] } = req.body || {};
  const err = (m) => res.status(400).json({ error: m });
  if (!db.mapas[zona]) return res.status(404).json({ error: 'La zona no existe' });
  if (!enRango(ancho, 400, 2000) || !enRango(alto, 300, 2000)) return err('El lienzo debe medir entre 400×300 y 2000×2000');
  if (celdas.length > 400 || elementos.length > 600) return err('El mapa supera el máximo de elementos');
  const vistos = new Set(), limpias = [];
  for (const c of celdas) {
    const numero = String(c.numero || '').trim().slice(0, 8);
    if (!numero) return err('Todas las celdas deben tener número');
    if (vistos.has(numero.toLowerCase())) return err(`El número de celda "${numero}" está repetido`);
    vistos.add(numero.toLowerCase());
    if (![c.x, c.y].every((v) => enRango(v, -50, 3000)) || ![c.w, c.h].every((v) => enRango(v, 20, 400))) return err(`La celda ${numero} tiene medidas no válidas`);
    limpias.push({ idCelda: c.idCelda ? Number(c.idCelda) : null, numero, x: entero(c.x), y: entero(c.y), w: entero(c.w), h: entero(c.h),
      rot: [0, 90, 180, 270].includes(Number(c.rot)) ? Number(c.rot) : 0, tipo: ['carro', 'moto', 'discapacidad'].includes(c.tipo) ? c.tipo : 'carro' });
  }
  const els = [];
  for (const e of elementos) {
    if (!TIPOS_EL.includes(e.tipo)) return err('Tipo de elemento no válido: ' + e.tipo);
    if (![e.x, e.y].every((v) => enRango(v, -50, 3000)) || ![e.w, e.h].every((v) => enRango(v, 4, 2000))) return err('Un elemento tiene medidas no válidas');
    const el = { tipo: e.tipo, x: entero(e.x), y: entero(e.y), w: entero(e.w), h: entero(e.h), rot: [0, 90, 180, 270].includes(Number(e.rot)) ? Number(e.rot) : 0 };
    if (['texto', 'entrada', 'salida'].includes(e.tipo)) el.texto = String(e.texto || '').slice(0, 40);
    if (e.tipo === 'torre') { if (!db.torres.some((t) => t.idTorre === Number(e.ref))) return err('Cada acceso a torre debe indicar una torre válida'); el.ref = Number(e.ref); }
    els.push(el);
  }
  // no se puede borrar una celda que no esté libre (ocupada, mensual o reservada)
  const conservar = new Set(limpias.filter((c) => c.idCelda).map((c) => c.idCelda));
  const bloqueadas = db.celdas.filter((c) => c.zona === zona && !conservar.has(c.idCelda) && c.estado !== 'libre');
  if (bloqueadas.length) return err(`No se puede eliminar ${bloqueadas.map((c) => c.numero + ' (' + c.estado + ')').join(', ')}: la celda no está libre`);
  db.celdas = db.celdas.filter((c) => c.zona !== zona || conservar.has(c.idCelda));
  for (const c of limpias) {
    const { idCelda, ...geo } = c, ex = idCelda && db.celdas.find((x) => x.idCelda === idCelda && x.zona === zona);
    if (ex) Object.assign(ex, geo);
    else db.celdas.push({ idCelda: db.seq.celda++, zona, estado: 'libre', placa: null, propietario: null, ...geo });
  }
  db.mapas[zona] = { ancho: entero(ancho), alto: entero(alto), elementos: els };
  emitir(); res.json(mapaOut(zona));
});

// Zonas (cada zona es un mapa): crear desde plantilla, renombrar y eliminar
const nombreZona = (n) => String(n || '').trim().replace(/\s+/g, ' ');
app.post('/api/zonas', auth(ADM), (req, res) => {
  const nombre = nombreZona(req.body.nombre), err = (m, c = 400) => res.status(c).json({ error: m });
  if (nombre.length < 2 || nombre.length > 30) return err('El nombre de la zona debe tener entre 2 y 30 caracteres');
  if (db.zonas.some((z) => z.toLowerCase() === nombre.toLowerCase())) return err('Ya existe una zona con ese nombre', 409);
  db.zonas.push(nombre); aplicarPlantilla(nombre, req.body.plantilla);
  emitir(); res.status(201).json(mapaOut(nombre));
});
app.put('/api/zonas/:nombre', auth(ADM), (req, res) => {
  const viejo = req.params.nombre, nuevo = nombreZona(req.body.nombre), err = (m, c = 400) => res.status(c).json({ error: m });
  if (!db.mapas[viejo]) return err('La zona no existe', 404);
  if (nuevo.length < 2 || nuevo.length > 30) return err('El nombre de la zona debe tener entre 2 y 30 caracteres');
  if (db.zonas.some((z) => z !== viejo && z.toLowerCase() === nuevo.toLowerCase())) return err('Ya existe una zona con ese nombre', 409);
  db.zonas = db.zonas.map((z) => (z === viejo ? nuevo : z)); db.mapas[nuevo] = db.mapas[viejo]; if (nuevo !== viejo) delete db.mapas[viejo];
  db.celdas.forEach((c) => { if (c.zona === viejo) c.zona = nuevo; });
  emitir(); res.json({ ok: true, nombre: nuevo });
});
app.delete('/api/zonas/:nombre', auth(ADM), (req, res) => {
  const z = req.params.nombre, err = (m) => res.status(400).json({ error: m });
  if (!db.mapas[z]) return res.status(404).json({ error: 'La zona no existe' });
  if (db.zonas.length <= 1) return err('Debe quedar al menos una zona');
  const bloq = db.celdas.filter((c) => c.zona === z && c.estado !== 'libre');
  if (bloq.length) return err(`No se puede eliminar la zona: ${bloq.length} celda(s) están ocupadas, reservadas o son mensuales`);
  db.zonas = db.zonas.filter((x) => x !== z); delete db.mapas[z]; db.celdas = db.celdas.filter((c) => c.zona !== z);
  emitir(); res.json({ ok: true });
});

app.get('/api/dashboard', auth(OP), (req, res) => {
  const zona = req.query.zona || db.zonas[0];
  const cs = db.celdas.filter((c) => c.zona === zona);
  const g = guardiaActivo();
  const reg = db.accesos.filter((a) => a.guardiaId === g.id && Date.now() - new Date(a.entrada) < 864e5);
  res.json({ zona, libres: cs.filter((c) => c.estado === 'libre').length, ocupados: cs.filter((c) => c.estado !== 'libre').length,
    visitantesHoy: db.accesos.filter((a) => a.clase === 'visitante' && esHoy(a.entrada)).length,
    recaudoTurno: suma(reg), guardiaActivo: g, registrados: reg.map(ser).reverse() });
});

// ------------------------------------------------------------------ accesos (RF01, RF04)
app.get('/api/placa/:placa', auth(OP), (req, res) => {
  const p = normPlaca(req.params.placa);
  const m = db.celdas.find((c) => c.estado === 'mensual' && c.placa === p);
  res.json({ mensual: m ? { celda: m.numero, zona: m.zona, propietario: m.propietario } : null, dentro: !!activo(p) });
});
app.get('/api/accesos/activos', auth(OP), (req, res) => res.json(db.accesos.filter((a) => !a.salida).map(ser)));
app.post('/api/accesos/entrada', auth(OP), (req, res) => {
  let { tipo = 'carro', clase = 'visitante', celdaId, danos } = req.body || {};
  const placa = normPlaca(req.body.placa);
  if (!placa) return res.status(400).json({ error: 'La placa es obligatoria' });
  if (activo(placa)) return res.status(400).json({ error: 'Ese vehículo ya está dentro del parqueadero' });
  const mensual = db.celdas.find((c) => c.estado === 'mensual' && c.placa === placa);
  let celda;
  if (mensual) { celda = mensual; clase = 'residente'; }
  else {
    celda = db.celdas.find((c) => c.idCelda === Number(celdaId));
    if (!celda || celda.estado !== 'libre') return res.status(400).json({ error: 'La celda no está disponible' });
    celda.estado = 'ocupada';
  }
  const g = req.user.rol === 'guardia' ? db.guardias.find((x) => x.id === req.user.guardiaId) || guardiaActivo() : guardiaActivo();
  const a = addAcceso({ placa, tipo, clase, mensualidad: !!mensual, celdaId: celda.idCelda, guardiaId: g.id, entrada: new Date().toISOString(), danos: danos || null });
  emitirCelda(celda);
  res.status(201).json(ser(a));
});
app.get('/api/salida/preview', auth(OP), (req, res) => {
  const a = activo(req.query.placa);
  if (!a) return res.status(404).json({ error: 'No hay un vehículo dentro con esa placa' });
  res.json({ acceso: ser(a), ahora: new Date().toISOString(), ...liquidar(a) });
});
app.put('/api/salida', auth(OP), (req, res) => {
  const a = activo(req.body.placa);
  if (!a) return res.status(404).json({ error: 'No hay un vehículo dentro con esa placa' });
  a.salida = new Date().toISOString();
  a.valor = liquidar(a, a.salida).total;
  const c = db.celdas.find((x) => x.idCelda === a.celdaId);
  if (c && c.estado === 'ocupada') c.estado = 'libre';
  if (c) emitirCelda(c); else emitir();
  res.json(ser(a));
});
app.get('/api/accesos/mios', auth(RES), (req, res) =>
  res.json(db.accesos.filter((a) => (req.user.placas || []).includes(a.placa)).map(ser).reverse()));

// ------------------------------------------------------------------ historial y Excel (RF09)
app.get('/api/historial', auth(ADM), (req, res) => {
  const mes = db.accesos.filter((a) => Date.now() - new Date(a.entrada) < 30 * 864e5);
  res.json({
    kpis: { vehiculos: mes.length, recaudo: suma(mes), guardias: db.guardias.length },
    turnos: db.guardias.map((g) => { const r = mes.filter((a) => a.guardiaId === g.id); return { ...g, vehiculos: r.length, recaudo: suma(r) }; }),
    vehiculos: mes.map(ser).reverse(),
  });
});
const filaExcel = (a, i) => { const s = ser(a); return { id: a.id, n: i + 1, placa: a.placa, tipo: a.clase === 'residente' ? 'Residente' : 'Visitante', guardia: s.guardia, fecha: fechaDM(a.entrada), recaudo: a.valor }; };
app.get('/api/excel', auth(ADM), (req, res) => res.json(db.accesos.map(filaExcel).reverse()));
app.put('/api/excel/:id', auth(ADM), (req, res) => {
  const a = db.accesos.find((x) => x.id === Number(req.params.id));
  if (!a) return res.status(404).json({ error: 'Registro no encontrado' });
  const { placa, tipo, guardia, recaudo } = req.body;
  if (placa) a.placa = normPlaca(placa);
  if (tipo) a.clase = String(tipo).toLowerCase() === 'residente' ? 'residente' : 'visitante';
  const gq = String(guardia || '').toLowerCase().replace(/^[a-z]\. /, '');
  const g = gq && db.guardias.find((x) => x.nombre.toLowerCase().includes(gq));
  if (g) a.guardiaId = g.id;
  if (recaudo !== undefined) a.valor = recaudo === '' || recaudo === '—' ? null : Number(String(recaudo).replace(/\D/g, ''));
  res.json(filaExcel(a, 0));
});
app.post('/api/excel/importar', auth(ADM), (req, res) => {
  let ok = 0; const errores = [];
  (req.body.filas || []).forEach((f, i) => {
    const placa = normPlaca(f.Placa || f.placa);
    if (!placa) return errores.push(`Fila ${i + 1}: sin placa`);
    const m = String(f.Fecha || f.fecha || '').match(/(\d{1,2})\/(\d{1,2})/);
    const d = new Date(); if (m) { d.setMonth(Number(m[2]) - 1, Number(m[1])); } d.setHours(12, 0, 0, 0);
    const nombre = String(f.Guardia || f.guardia || '').toLowerCase();
    const g = db.guardias.find((x) => nombre && x.nombre.toLowerCase().includes(nombre.replace(/^[a-z]\. /, ''))) || guardiaActivo();
    const val = String(f.Recaudo ?? f.recaudo ?? '').replace(/\D/g, '');
    addAcceso({ placa, clase: String(f.Tipo || f.tipo || '').toLowerCase() === 'residente' ? 'residente' : 'visitante',
      guardiaId: g.id, entrada: d.toISOString(), salida: new Date(d.getTime() + 3600000).toISOString(), valor: val ? Number(val) : 0 });
    ok++;
  });
  res.json({ importados: ok, errores });
});

// ------------------------------------------------------------------ edición: guardias y tarifas
const guardiaOut = (g) => { const u = db.usuarios.find((x) => x.guardiaId === g.id); return { ...g, correo: u ? u.correo : '', telefono: u ? u.telefono : '' }; };
const reTurno = /^\d{2}:\d{2}–\d{2}:\d{2}$/;
app.get('/api/guardias', auth(ADM), (req, res) => res.json(db.guardias.map(guardiaOut)));
// El administrador registra al guardia: se crean el turno y su cuenta de acceso
app.post('/api/guardias', auth(ADM), (req, res) => {
  const { nombre, turno, correo, telefono, password } = req.body || {};
  const mail = String(correo || '').trim().toLowerCase(), err = (m, c = 400) => res.status(c).json({ error: m });
  if (!nombre || nombre.trim().length < 3) return err('Escribe el nombre del guardia');
  if (!reTurno.test(turno || '')) return err('El turno debe tener formato 08:00–16:00');
  if (!reCorreo.test(mail)) return err('El correo no es válido');
  if (db.usuarios.some((u) => u.correo === mail)) return err('Ese correo ya está registrado', 409);
  if (String(password || '').length < 6) return err('La contraseña inicial debe tener mínimo 6 caracteres');
  const g = { id: db.seq.guardia++, nombre: nombre.trim(), turno };
  db.guardias.push(g);
  db.usuarios.push({ id: db.seq.usuario++, nombre: g.nombre, correo: mail, telefono: telefono || '', rol: 'guardia', guardiaId: g.id, hash: hash(password) });
  res.status(201).json(guardiaOut(g));
});
app.put('/api/guardias/:id', auth(ADM), (req, res) => {
  const g = db.guardias.find((x) => x.id === Number(req.params.id));
  if (!g) return res.status(404).json({ error: 'No existe' });
  const { nombre, turno, telefono, password } = req.body || {};
  if (turno && !reTurno.test(turno)) return res.status(400).json({ error: 'El turno debe tener formato 08:00–16:00' });
  if (password && password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener mínimo 6 caracteres' });
  const u = db.usuarios.find((x) => x.guardiaId === g.id);
  if (nombre) { g.nombre = nombre; if (u) u.nombre = nombre; }
  if (turno) g.turno = turno;
  if (u && telefono !== undefined) u.telefono = telefono;
  if (u && password) u.hash = hash(password);
  res.json(guardiaOut(g));
});
app.delete('/api/guardias/:id', auth(ADM), (req, res) => {
  if (db.guardias.length <= 1) return res.status(400).json({ error: 'Debe quedar al menos un guardia' });
  const id = Number(req.params.id);
  db.guardias = db.guardias.filter((x) => x.id !== id);
  db.usuarios = db.usuarios.filter((u) => u.guardiaId !== id); // se revoca su acceso
  res.json({ ok: true });
});
app.put('/api/tarifas', auth(ADM), (req, res) => {
  const { primeraHora, horaAdicional, fraccion } = req.body || {};
  if ([primeraHora, horaAdicional, fraccion].some((v) => !(Number(v) >= 0))) return res.status(400).json({ error: 'Valores inválidos' });
  db.tarifas = { primeraHora: Number(primeraHora), horaAdicional: Number(horaAdicional), fraccion: Number(fraccion) };
  res.json(db.tarifas);
});

// ------------------------------------------------------------------ residente (RF05-RF07) y recibos
app.get('/api/estado-cuenta', auth(RES), (req, res) => res.json(db.cuentas[req.user.id] || { saldo: 0, estado: 'Al día', detalle: '' }));
app.get('/api/recibos', auth(), (req, res) => {
  const l = req.user.rol === 'residente' ? db.recibos.filter((r) => r.userId === req.user.id) : req.user.rol === 'administrador' ? db.recibos : [];
  res.json([...l].reverse().map(({ archivo, ...r }) => ({ ...r, tieneArchivo: !!archivo })));
});
app.get('/api/recibos/:id/archivo', auth(), (req, res) => {
  const r = db.recibos.find((x) => x.id === Number(req.params.id));
  if (!r || !r.archivo) return res.status(404).json({ error: 'Sin archivo adjunto (dato de demostración)' });
  res.json({ nombre: r.nombre, archivo: r.archivo });
});
app.post('/api/recibos', auth(RES), (req, res) => {
  const { concepto, valor, nombre, archivo } = req.body || {};
  if (!concepto || !valor) return res.status(400).json({ error: 'Concepto y valor son obligatorios' });
  const r = { id: db.seq.recibo++, userId: req.user.id, residente: req.user.nombre, concepto, valor: Number(valor), nombre: nombre || 'sin_adjunto', archivo: archivo || null, estado: 'Pendiente', fecha: new Date().toISOString() };
  db.recibos.push(r); emitir(); res.status(201).json({ ok: true });
});
app.put('/api/recibos/:id', auth(ADM), (req, res) => {
  const r = db.recibos.find((x) => x.id === Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'No existe' });
  r.estado = r.estado === 'Pendiente' ? 'Revisado' : 'Pendiente'; res.json({ estado: r.estado });
});
app.get('/api/solicitudes', auth(), (req, res) => {
  const l = req.user.rol === 'residente' ? db.solicitudes.filter((s) => s.userId === req.user.id) : req.user.rol === 'administrador' ? db.solicitudes : [];
  res.json([...l].reverse().map((s) => ({ ...s, celda: (db.celdas.find((c) => c.idCelda === s.celdaId) || {}).numero })));
});
app.post('/api/solicitudes', auth(RES), (req, res) => {
  const { placa, tipo, celdaId } = req.body || {};
  const c = db.celdas.find((x) => x.idCelda === Number(celdaId));
  if (!c || c.estado !== 'libre') return res.status(400).json({ error: 'Elige una celda libre de la lista sugerida' });
  c.estado = 'reservada';
  db.solicitudes.push({ id: db.seq.solicitud++, userId: req.user.id, residente: req.user.nombre, placa, tipo, celdaId: c.idCelda, estado: 'Pendiente', fecha: new Date().toISOString() });
  emitirCelda(c); res.status(201).json({ ok: true, celda: c.numero });
});
app.put('/api/solicitudes/:id', auth(ADM), (req, res) => {
  const s = db.solicitudes.find((x) => x.id === Number(req.params.id));
  if (!s || s.estado !== 'Pendiente') return res.status(400).json({ error: 'Solicitud no disponible' });
  const c = db.celdas.find((x) => x.idCelda === s.celdaId);
  if (req.body.accion === 'aprobar') { s.estado = 'Aprobada'; Object.assign(c, { estado: 'mensual', placa: s.placa, propietario: s.residente }); }
  else { s.estado = 'Rechazada'; c.estado = 'libre'; }
  emitirCelda(c); res.json(s);
});

io.on('connection', (s) => console.log('Cliente conectado:', s.id));
// ------------------------------------------------------------------ arranque
async function iniciar() {
  if (process.env.DATABASE_URL) {
    try {
      bd = await persistencia.conectar(process.env.DATABASE_URL);
      const r = await bd.iniciar(db); // crea tablas; si ya hay datos, reemplaza el estado en memoria por los guardados
      if (r.cargado && process.env.ADMIN_RESET === '1') { // recuperación: restablece el correo y la clave del administrador desde las variables de entorno
        const adm = db.usuarios.find((u) => u.rol === 'administrador');
        if (adm) { adm.correo = ADMIN_EMAIL; adm.hash = hash(ADMIN_PASSWORD); bd.programar(db); console.log('Administrador restablecido desde ADMIN_EMAIL / ADMIN_PASSWORD (quita ADMIN_RESET después).'); }
      }
      console.log(`Base de datos ${bd.tipo}: ${r.cargado ? `datos cargados (${r.filas} filas)` : 'tablas creadas con los datos iniciales'}`);
    } catch (e) { console.error('No se pudo usar la base de datos:', e.message); process.exit(1); }
  } else console.warn('Sin DATABASE_URL: los datos viven en memoria y se perderán al reiniciar.');
  server.listen(PORT, () => console.log(`Manage Parking en http://localhost:${PORT} · modo ${DEMO ? 'DEMOSTRACIÓN' : 'REAL'}`));
}
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, async () => { try { if (bd) await bd.vaciar(db); } catch (e) { console.error(e.message); } process.exit(0); }); // el hosting avisa con SIGTERM antes de apagar
module.exports = { listo: iniciar() };
