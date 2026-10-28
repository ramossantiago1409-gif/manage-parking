'use strict';
// Persistencia en base de datos SQL (PostgreSQL, MySQL/MariaDB o SQLite).
// Modelo: el servidor trabaja con el estado en memoria (rápido) y este módulo lo refleja en tablas relacionales:
//  · al arrancar crea las tablas si no existen y, si ya hay datos, los carga en memoria;
//  · después de cada petición que modifica algo, compara contra lo ya guardado y escribe SOLO lo que cambió (en una transacción);
//  · al apagar el servicio (SIGTERM) guarda lo pendiente.
// Tipos: int, num (decimal), k (clave corta), text, long (texto largo / JSON / archivos).
const num = (v) => { const n = Number(v); return v === null || v === undefined || v === '' || !Number.isFinite(n) ? null : n; };
const txt = (v) => (v === undefined || v === null ? null : String(v));
const ord = (a, b) => a.id - b.id;

const TABLAS = [
  { nombre: 'config', pk: 'clave', cols: { clave: 'k', valor: 'long' },
    leer: (db) => [['conjunto', db.conjunto], ['tarifas', db.tarifas], ['seq', db.seq], ['inicializado', 1]].map(([clave, v]) => ({ clave, valor: JSON.stringify(v) })),
    cargar: (f, db) => { for (const r of f) { let v; try { v = JSON.parse(r.valor); } catch { continue; }
      if (r.clave === 'conjunto') db.conjunto = v; else if (r.clave === 'tarifas') db.tarifas = v; else if (r.clave === 'seq') Object.assign(db.seq, v); } } },
  { nombre: 'zonas', pk: 'nombre', cols: { nombre: 'k', orden: 'int', ancho: 'int', alto: 'int', elementos: 'long' },
    leer: (db) => db.zonas.map((nombre, i) => ({ nombre, orden: i, ancho: db.mapas[nombre].ancho, alto: db.mapas[nombre].alto, elementos: JSON.stringify(db.mapas[nombre].elementos) })),
    cargar: (f, db) => { f.sort((a, b) => a.orden - b.orden); db.zonas = f.map((r) => r.nombre); db.mapas = {};
      f.forEach((r) => { db.mapas[r.nombre] = { ancho: r.ancho, alto: r.alto, elementos: JSON.parse(r.elementos) }; }); } },
  { nombre: 'torres', pk: 'id_torre', cols: { id_torre: 'int', nombre: 'text' },
    leer: (db) => db.torres.map((t) => ({ id_torre: t.idTorre, nombre: t.nombre })),
    cargar: (f, db) => { db.torres = f.map((r) => ({ idTorre: r.id_torre, nombre: r.nombre })).sort((a, b) => a.idTorre - b.idTorre); } },
  { nombre: 'guardias', pk: 'id', cols: { id: 'int', nombre: 'text', turno: 'text' },
    leer: (db) => db.guardias.map((g) => ({ id: g.id, nombre: g.nombre, turno: g.turno })),
    cargar: (f, db) => { db.guardias = f.map((r) => ({ id: r.id, nombre: r.nombre, turno: r.turno })).sort(ord); } },
  { nombre: 'usuarios', pk: 'id', cols: { id: 'int', nombre: 'text', correo: 'text', telefono: 'text', rol: 'text', hash: 'text', guardia_id: 'int', torre: 'int', apartamento: 'text', placas: 'long', registrado: 'text' },
    leer: (db) => db.usuarios.map((u) => ({ id: u.id, nombre: u.nombre, correo: u.correo, telefono: txt(u.telefono) ?? '', rol: u.rol, hash: u.hash, guardia_id: num(u.guardiaId), torre: num(u.torre),
      apartamento: txt(u.apartamento), placas: u.placas ? JSON.stringify(u.placas) : null, registrado: txt(u.registrado) })),
    cargar: (f, db) => { db.usuarios = f.map((r) => { const u = { id: r.id, nombre: r.nombre, correo: r.correo, telefono: r.telefono || '', rol: r.rol, hash: r.hash };
      if (r.guardia_id != null) u.guardiaId = r.guardia_id; if (r.torre != null) u.torre = r.torre; if (r.apartamento != null) u.apartamento = r.apartamento;
      if (r.placas) u.placas = JSON.parse(r.placas); if (r.registrado) u.registrado = r.registrado; return u; }).sort(ord); } },
  { nombre: 'celdas', pk: 'id_celda', cols: { id_celda: 'int', zona: 'text', numero: 'text', x: 'int', y: 'int', w: 'int', h: 'int', rot: 'int', tipo: 'text', estado: 'text', placa: 'text', propietario: 'text' },
    leer: (db) => db.celdas.map((c) => ({ id_celda: c.idCelda, zona: c.zona, numero: c.numero, x: c.x, y: c.y, w: c.w, h: c.h, rot: c.rot || 0, tipo: c.tipo, estado: c.estado, placa: txt(c.placa), propietario: txt(c.propietario) })),
    cargar: (f, db) => { db.celdas = f.map((r) => ({ idCelda: r.id_celda, zona: r.zona, numero: r.numero, x: r.x, y: r.y, w: r.w, h: r.h, rot: r.rot, tipo: r.tipo, estado: r.estado, placa: r.placa, propietario: r.propietario }))
      .sort((a, b) => a.idCelda - b.idCelda); } },
  { nombre: 'accesos', pk: 'id', cols: { id: 'int', placa: 'text', tipo: 'text', clase: 'text', mensualidad: 'int', celda_id: 'int', guardia_id: 'int', entrada: 'text', salida: 'text', valor: 'num', danos: 'long' },
    leer: (db) => db.accesos.map((a) => ({ id: a.id, placa: a.placa, tipo: txt(a.tipo), clase: txt(a.clase), mensualidad: a.mensualidad ? 1 : 0, celda_id: num(a.celdaId), guardia_id: num(a.guardiaId),
      entrada: txt(a.entrada), salida: txt(a.salida), valor: num(a.valor), danos: a.danos ? JSON.stringify(a.danos) : null })),
    cargar: (f, db) => { db.accesos = f.map((r) => ({ id: r.id, placa: r.placa, tipo: r.tipo, clase: r.clase, mensualidad: !!r.mensualidad, celdaId: r.celda_id, guardiaId: r.guardia_id,
      entrada: r.entrada, salida: r.salida, valor: r.valor, danos: r.danos ? JSON.parse(r.danos) : null })).sort(ord); } },
  { nombre: 'recibos', pk: 'id', cols: { id: 'int', user_id: 'int', residente: 'text', concepto: 'text', valor: 'num', nombre: 'text', archivo: 'long', estado: 'text', fecha: 'text' },
    firma: (f) => ({ ...f, archivo: f.archivo ? f.archivo.length : null }), // el archivo nunca cambia: basta su longitud para detectar cambios
    leer: (db) => db.recibos.map((r) => ({ id: r.id, user_id: num(r.userId), residente: txt(r.residente), concepto: txt(r.concepto), valor: num(r.valor), nombre: txt(r.nombre), archivo: txt(r.archivo), estado: txt(r.estado), fecha: txt(r.fecha) })),
    cargar: (f, db) => { db.recibos = f.map((r) => ({ id: r.id, userId: r.user_id, residente: r.residente, concepto: r.concepto, valor: r.valor, nombre: r.nombre, archivo: r.archivo, estado: r.estado, fecha: r.fecha })).sort(ord); } },
  { nombre: 'solicitudes', pk: 'id', cols: { id: 'int', user_id: 'int', residente: 'text', placa: 'text', tipo: 'text', celda_id: 'int', estado: 'text', fecha: 'text' },
    leer: (db) => db.solicitudes.map((s) => ({ id: s.id, user_id: num(s.userId), residente: txt(s.residente), placa: txt(s.placa), tipo: txt(s.tipo), celda_id: num(s.celdaId), estado: txt(s.estado), fecha: txt(s.fecha) })),
    cargar: (f, db) => { db.solicitudes = f.map((r) => ({ id: r.id, userId: r.user_id, residente: r.residente, placa: r.placa, tipo: r.tipo, celdaId: r.celda_id, estado: r.estado, fecha: r.fecha })).sort(ord); } },
  { nombre: 'cuentas', pk: 'user_id', cols: { user_id: 'int', saldo: 'num', estado: 'text', detalle: 'text' },
    leer: (db) => Object.entries(db.cuentas).map(([uid, c]) => ({ user_id: Number(uid), saldo: num(c.saldo) ?? 0, estado: txt(c.estado), detalle: txt(c.detalle) ?? '' })),
    cargar: (f, db) => { db.cuentas = {}; f.forEach((r) => { db.cuentas[r.user_id] = { saldo: r.saldo, estado: r.estado, detalle: r.detalle }; }); } },
];

// ---------- SQL por dialecto
const TIPO = (d, t) => ({ int: 'INTEGER', k: 'VARCHAR(100)', text: 'TEXT', long: d === 'mysql' ? 'LONGTEXT' : 'TEXT', num: d === 'postgres' ? 'DOUBLE PRECISION' : d === 'mysql' ? 'DOUBLE' : 'REAL' }[t]);
const ddl = (ad, t) => `CREATE TABLE IF NOT EXISTS ${ad.id(t.nombre)} (${Object.entries(t.cols).map(([c, ty]) => `${ad.id(c)} ${TIPO(ad.tipo, ty)}${c === t.pk ? ' NOT NULL' : ''}`).join(', ')}, PRIMARY KEY (${ad.id(t.pk)}))${ad.tipo === 'mysql' ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : ''}`;
function upsert(ad, t, fila) {
  const cols = Object.keys(t.cols), resto = cols.filter((c) => c !== t.pk);
  const ins = `INSERT INTO ${ad.id(t.nombre)} (${cols.map(ad.id).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
  const upd = ad.tipo === 'mysql' ? ` ON DUPLICATE KEY UPDATE ${resto.map((c) => `${ad.id(c)} = VALUES(${ad.id(c)})`).join(', ')}`
    : ` ON CONFLICT (${ad.id(t.pk)}) DO UPDATE SET ${resto.map((c) => `${ad.id(c)} = EXCLUDED.${ad.id(c)}`).join(', ')}`;
  return [ins + upd, cols.map((c) => (fila[c] === undefined ? null : fila[c]))];
}

// ---------- adaptadores
function limpiarUrl(url) { // quita parámetros que el driver no entiende; el SSL se decide aparte
  try { const u = new URL(url); ['sslmode', 'channel_binding'].forEach((p) => u.searchParams.delete(p)); return { url: u.toString(), host: u.hostname }; } catch { return { url, host: '' }; }
}
const quiereSsl = (url, host) => process.env.DB_SSL === '1' || (process.env.DB_SSL !== '0' && (/sslmode=(require|verify)/.test(url) || /\.(render\.com|neon\.tech|supabase\.co|aivencloud\.com|tidbcloud\.com)$/.test(host)));

async function adaptadorSqlite(url) {
  let DatabaseSync; try { ({ DatabaseSync } = require('node:sqlite')); } catch { throw new Error('SQLite requiere Node 22.13 o superior; usa PostgreSQL o MySQL en este entorno'); }
  const db = new DatabaseSync(url.replace(/^sqlite:(\/\/)?/i, '') || ':memory:');
  const q = async (sql, p = []) => { const st = db.prepare(sql); if (/^\s*select/i.test(sql)) return st.all(...p).map((r) => ({ ...r })); st.run(...p); return []; };
  return { tipo: 'sqlite', id: (n) => `"${n}"`, q, cerrar: async () => db.close(),
    tx: async (fn) => { db.exec('BEGIN'); try { await fn(q); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } } };
}
async function adaptadorPg(url) {
  const { Pool } = require('pg'), { url: u, host } = limpiarUrl(url);
  const pool = new Pool({ connectionString: u, ssl: quiereSsl(url, host) ? { rejectUnauthorized: false } : false, max: 4, connectionTimeoutMillis: 30000 });
  pool.on('error', (e) => console.error('[BD] conexión inactiva con error:', e.message));
  const conv = (sql) => { let i = 0; return sql.replace(/\?/g, () => '$' + ++i); };
  const q = async (sql, p = []) => (await pool.query(conv(sql), p)).rows;
  return { tipo: 'postgres', id: (n) => `"${n}"`, q, cerrar: () => pool.end(),
    tx: async (fn) => { const c = await pool.connect(); try { await c.query('BEGIN'); await fn(async (sql, p = []) => (await c.query(conv(sql), p)).rows); await c.query('COMMIT'); }
      catch (e) { try { await c.query('ROLLBACK'); } catch { /* ya cerrada */ } throw e; } finally { c.release(); } } };
}
async function adaptadorMysql(url) {
  const mysql = require('mysql2/promise'), { url: u, host } = limpiarUrl(url);
  const pool = mysql.createPool({ uri: u, ssl: quiereSsl(url, host) ? { rejectUnauthorized: false } : undefined, connectionLimit: 4, charset: 'utf8mb4', connectTimeout: 30000 });
  const fila = (r) => (Array.isArray(r) ? r : []);
  const q = async (sql, p = []) => fila((await pool.query(sql, p))[0]);
  return { tipo: 'mysql', id: (n) => '`' + n + '`', q, cerrar: () => pool.end(),
    tx: async (fn) => { const c = await pool.getConnection(); try { await c.beginTransaction(); await fn(async (sql, p = []) => fila((await c.query(sql, p))[0])); await c.commit(); }
      catch (e) { try { await c.rollback(); } catch { /* ya cerrada */ } throw e; } finally { c.release(); } } };
}

class Persistencia {
  constructor(ad) { this.ad = ad; this.tipo = ad.tipo; this.ultimo = {}; this.ocupado = false; this.pendiente = false; this.t = null; }
  firmas(db) {
    const out = {};
    for (const t of TABLAS) { const m = new Map(); for (const f of t.leer(db)) m.set(String(f[t.pk]), { s: JSON.stringify(t.firma ? t.firma(f) : f), v: f[t.pk] }); out[t.nombre] = m; }
    return out;
  }
  async iniciar(db) {
    await this.ad.q('SELECT 1');
    for (const t of TABLAS) await this.ad.q(ddl(this.ad, t));
    const cargado = (await this.ad.q(`SELECT * FROM ${this.ad.id('config')}`)).some((r) => r.clave === 'inicializado');
    let filas = 0;
    if (cargado) for (const t of TABLAS) { const f = await this.ad.q(`SELECT * FROM ${this.ad.id(t.nombre)}`); filas += f.length; t.cargar(f, db); }
    this.ultimo = cargado ? this.firmas(db) : {};
    await this.guardar(db); // primera vez: escribe el estado inicial · siguientes: no hay diferencias
    return { cargado, filas };
  }
  programar(db) { clearTimeout(this.t); this.t = setTimeout(() => this.guardar(db), 400); }
  async guardar(db) {
    if (this.ocupado) { this.pendiente = true; return; }
    this.ocupado = true;
    try { do { this.pendiente = false; await this.ciclo(db); } while (this.pendiente); }
    catch (e) { console.error('[BD] Error al guardar (se reintentará en 5 s):', e.message); clearTimeout(this.t); this.t = setTimeout(() => this.guardar(db), 5000); }
    finally { this.ocupado = false; }
  }
  async ciclo(db) {
    const nuevo = this.firmas(db), ops = [];
    for (const t of TABLAS) {
      const prev = this.ultimo[t.nombre] || new Map(), filas = new Map(t.leer(db).map((f) => [String(f[t.pk]), f]));
      for (const [k, { s }] of nuevo[t.nombre]) if (!prev.has(k) || prev.get(k).s !== s) ops.push(upsert(this.ad, t, filas.get(k)));
      for (const [k, { v }] of prev) if (!nuevo[t.nombre].has(k)) ops.push([`DELETE FROM ${this.ad.id(t.nombre)} WHERE ${this.ad.id(t.pk)} = ?`, [v]]);
    }
    if (!ops.length) return;
    await this.ad.tx(async (q) => { for (const [sql, p] of ops) await q(sql, p); });
    this.ultimo = nuevo;
  }
  async vaciar(db) { clearTimeout(this.t); await this.guardar(db); while (this.ocupado) await new Promise((r) => setTimeout(r, 50)); }
  async borrarTodo() { for (const t of [...TABLAS].reverse()) await this.ad.q(`DROP TABLE IF EXISTS ${this.ad.id(t.nombre)}`); }
  cerrar() { return this.ad.cerrar(); }
}

async function conectar(url) {
  const esq = ((url.match(/^([a-z0-9+]+):/i) || [])[1] || '').toLowerCase();
  const ad = esq === 'sqlite' ? await adaptadorSqlite(url) : ['postgres', 'postgresql'].includes(esq) ? await adaptadorPg(url) : ['mysql', 'mariadb'].includes(esq) ? await adaptadorMysql(url)
    : (() => { throw new Error('DATABASE_URL no reconocida: usa postgres://…, mysql://… o sqlite:ruta.db'); })();
  return new Persistencia(ad);
}
module.exports = { conectar, TABLAS, ddl, upsert };
