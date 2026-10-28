'use strict';
// Manage Parking v4 · cliente (Ionic web components por CDN + vistas por rol, según Mockups v1.0)
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const S = { token: localStorage.getItem('mp_token'), user: JSON.parse(localStorage.getItem('mp_user') || 'null'), zona: null, view: null, config: null };
const enc = encodeURIComponent;
const money = (n) => (n == null ? '—' : '$' + Number(n).toLocaleString('es-CO'));
const hm = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—');
const dm = (iso) => { if (!iso) return '—'; const d = new Date(iso); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ab = (n) => { if (!n) return ''; const p = n.trim().split(/\s+/); return p.length > 1 ? p[0][0] + '. ' + p[p.length - 1] : n; };
const dur = (min) => (min >= 60 ? Math.floor(min / 60) + ' h ' + (min % 60) + ' min' : min + ' min');

// Iconos vectoriales (estilo lineal) para una interfaz más limpia
const P = {
  menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  sheet: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  map: '<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/>',
  sliders: '<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/>',
  power: '<path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" x2="12" y1="2" y2="12"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  file: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><polyline points="14 2 14 8 20 8"/>',
  parking: '<rect width="18" height="18" x="3" y="3" rx="4"/><path d="M9.5 17V7h3.5a3 3 0 0 1 0 6H9.5"/>',
  plus: '<line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  down: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  up: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
  left: '<polyline points="15 18 9 12 15 6"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  coin: '<circle cx="12" cy="12" r="10"/><path d="M15 9.5a3 3 0 0 0-3-1.5c-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2a3.2 3.2 0 0 1-3.2-1.6M12 6v2m0 8v2"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  rotate: '<path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.7 1 6.3 2.7L21 8"/><path d="M21 3v5h-5"/>',
  cursor: '<path d="m3 3 7.1 17.5 2.5-7.9 7.9-2.5z"/>',
  grid: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  tree: '<path d="M12 22v-5"/><path d="M12 17a5 5 0 0 0 5-5 4 4 0 0 0-3-6 4 4 0 0 0-4-4 4 4 0 0 0-4 4 4 4 0 0 0-3 6 5 5 0 0 0 5 5z"/>',
  arrowup: '<line x1="12" x2="12" y1="19" y2="5"/><polyline points="5 12 12 5 19 12"/>',
  arrowdown: '<line x1="12" x2="12" y1="5" y2="19"/><polyline points="19 12 12 19 5 12"/>',
  arrowright: '<line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  arrowleft: '<line x1="19" x2="5" y1="12" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  door: '<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.56v16.16a1 1 0 0 1-1.24.97L5 20V5.56a2 2 0 0 1 1.5-1.94l4-1A2 2 0 0 1 13 4.56z"/>',
  octagon: '<polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>',
  building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  type: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>',
  square: '<rect width="18" height="18" x="3" y="3" rx="6"/>',
  minus: '<line x1="3" x2="21" y1="12" y2="12"/>',
  rows: '<rect width="18" height="7" x="3" y="3" rx="1"/><rect width="18" height="7" x="3" y="14" rx="1"/>',
  zebra: '<path d="M4 4v16M9 4v16M14 4v16M19 4v16"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
};
const ic = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
const kpi = (i, c, v, l) => `<div class="card kpi k-${c}"><span class="ki">${ic(i)}</span><b>${v}</b><small>${l}</small></div>`;


async function api(path, method = 'GET', body) {
  const r = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { if (r.status === 401 && S.token) logout(); throw new Error(d.error || 'Error de servidor'); }
  return d;
}
async function toast(message, color = 'dark') {
  const t = document.createElement('ion-toast'); Object.assign(t, { message, duration: 2600, position: 'top', color });
  document.body.appendChild(t); await t.present();
}
const run = (fn) => (...a) => { const h = (e) => toast(e.message, 'danger'); try { return Promise.resolve(fn(...a)).catch(h); } catch (e) { h(e); } };
// Formularios emergentes con ion-alert
function pedir(header, inputs, ok = 'Guardar') {
  return new Promise(async (res) => {
    const a = document.createElement('ion-alert'); a.header = header; a.inputs = inputs;
    a.buttons = [{ text: 'Cancelar', role: 'cancel', handler: () => res(null) }, { text: ok, handler: (v) => res(v) }];
    a.addEventListener('didDismiss', () => res(null)); document.body.appendChild(a); await a.present();
  });
}
const confirmar = (msg) => new Promise(async (res) => {
  const a = document.createElement('ion-alert'); a.header = 'Confirmar'; a.message = msg;
  a.buttons = [{ text: 'Cancelar', role: 'cancel', handler: () => res(false) }, { text: 'Aceptar', handler: () => res(true) }];
  a.addEventListener('didDismiss', () => res(false)); document.body.appendChild(a); await a.present();
});
const leerArchivo = (f) => new Promise((ok, ko) => { if (f.size > 2e6) return ko(new Error('El archivo supera 2 MB')); const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(f); });

// ------------------------------------------------------------------ componentes visuales
// Vista de cuadrícula (la de versiones anteriores): se conserva como alternativa al plano
const grid = (cs) => `<div class="cells" style="grid-template-columns:repeat(auto-fill,minmax(58px,1fr))">${[...cs].sort((a, b) => String(a.numero).localeCompare(String(b.numero), 'es', { numeric: true }))
  .map((c) => `<div class="cell ${c.estado}" title="${esc(c.placa || '')}">${esc(c.numero)}</div>`).join('')}</div>`;

// ---------- Plano 2D en SVG (se usa en todas las vistas; el editor lo reutiliza)
const COL = { libre: ['#10b981', 'rgba(16,185,129,.22)'], ocupada: ['#f43f5e', 'rgba(244,63,94,.24)'], mensual: ['#6366f1', 'rgba(99,102,241,.28)'], reservada: ['#f59e0b', 'rgba(245,158,11,.26)'] };
const DEFS = `<defs><pattern id="pt-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.3" fill="#86efac" fill-opacity=".7"/></pattern>
<pattern id="pt-barrier" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="16" fill="#facc15"/><rect x="8" width="8" height="16" fill="#0f172a"/></pattern></defs>`;
const torreNombre = (ref) => ((S.config.torres || []).find((t) => t.idTorre === Number(ref)) || {}).nombre || 'Torre';

// vehículo visto desde arriba, dentro de una caja w×h (rot: 0 arriba, 90 derecha, 180 abajo, 270 izquierda)
function carSvg(w, h, rot, color, moto) {
  const L = Math.max(w, h) * (moto ? 0.62 : 0.78), A = Math.min(w, h) * (moto ? 0.36 : 0.68);
  return `<g transform="translate(${w / 2} ${h / 2}) rotate(${rot})"><rect x="${-A / 2}" y="${-L / 2}" width="${A}" height="${L}" rx="${A * 0.28}" fill="${color}"/>
    <rect x="${-A * 0.36}" y="${-L * 0.26}" width="${A * 0.72}" height="${L * 0.2}" rx="3" fill="rgba(255,255,255,.55)"/><rect x="${-A * 0.36}" y="${L * 0.12}" width="${A * 0.72}" height="${L * 0.14}" rx="3" fill="rgba(0,0,0,.28)"/></g>`;
}
function celdaSvg(c, o = {}) {
  const [bd, fill] = COL[c.estado] || COL.libre, car = c.estado === 'ocupada' || c.estado === 'mensual';
  const ins = c.tipo === 'discapacidad' ? `<text x="${c.w - 5}" y="${c.h - 5}" text-anchor="end" font-size="14" fill="#38bdf8">♿</text>`
    : c.tipo === 'moto' ? `<text x="${c.w / 2}" y="${c.h - 4}" text-anchor="middle" font-size="9" font-weight="800" fill="#e2e8f0">MOTO</text>` : '';
  const R = c.estado === 'reservada' ? `<text x="${c.w / 2}" y="${c.h / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.min(c.w, c.h) * 0.45}" font-weight="800" fill="${bd}" fill-opacity=".85">R</text>` : '';
  return `<g class="sc" data-k="${c._id || 'k' + c.idCelda}" transform="translate(${c.x} ${c.y})"><title>${esc(c.numero)} · ${esc(c.estado)}${c.placa ? ' · ' + esc(c.placa) : ''}${c.propietario ? ' · ' + esc(c.propietario) : ''}</title>
    <rect width="${c.w}" height="${c.h}" rx="5" fill="${fill}" stroke="${o.resaltar ? '#38bdf8' : bd}" stroke-width="${o.resaltar ? 4 : 2}"/>
    ${car ? carSvg(c.w, c.h, Number(c.rot) || 0, bd, c.tipo === 'moto') : ''}${R}${ins}
    <text x="4" y="12" font-size="11" font-weight="800" fill="#f1f5f9" stroke="#0f172a" stroke-width="2.5" paint-order="stroke">${esc(c.numero)}</text></g>`;
}
function elSvg(e) {
  const w = e.w, h = e.h, rot = Number(e.rot) || 0;
  const wrap = (inner) => `<g class="se" data-k="${e._id || ''}" transform="translate(${e.x} ${e.y})"><rect width="${w}" height="${h}" fill="#000" fill-opacity="0"/>${inner}</g>`;
  switch (e.tipo) {
    case 'isla': { const r = Math.min(14, w / 3, h / 3); return wrap(`<rect width="${w}" height="${h}" rx="${r}" fill="#14532d" fill-opacity=".6" stroke="#4ade80" stroke-width="2"/><rect width="${w}" height="${h}" rx="${r}" fill="url(#pt-dots)"/>`); }
    case 'planta': { const r = Math.min(w, h) / 2; return wrap(`<circle cx="${w / 2}" cy="${h / 2}" r="${r}" fill="#166534" stroke="#4ade80" stroke-width="2"/><circle cx="${w / 2}" cy="${h / 2}" r="${r * 0.55}" fill="#22c55e"/><circle cx="${w / 2 - r * 0.15}" cy="${h / 2 - r * 0.15}" r="${r * 0.22}" fill="#86efac"/>`); }
    case 'muro': return wrap(`<rect width="${w}" height="${h}" fill="#15803d"/>`);
    case 'flecha': { const lw = rot % 180 ? h : w, lh = rot % 180 ? w : h, hd = Math.min(lw * 0.8, lh * 0.6), t = -lh / 2;
      return wrap(`<g transform="translate(${w / 2} ${h / 2}) rotate(${rot})"><polygon points="0,${t} ${lw / 2},${t + hd} ${lw * 0.18},${t + hd} ${lw * 0.18},${lh / 2} ${-lw * 0.18},${lh / 2} ${-lw * 0.18},${t + hd} ${-lw / 2},${t + hd}" fill="#f1f5f9" fill-opacity=".92"/></g>`); }
    case 'cruce': { const hz = w >= h, n = Math.max(3, Math.round((hz ? w : h) / 16)), st = (hz ? w : h) / n; let s = '';
      for (let i = 0; i < n; i += 2) s += hz ? `<rect x="${i * st}" width="${st}" height="${h}" fill="#f8fafc" fill-opacity=".9"/>` : `<rect y="${i * st}" width="${w}" height="${st}" fill="#f8fafc" fill-opacity=".9"/>`; return wrap(s); }
    case 'stop': return wrap(`<rect y="${h - 6}" width="${w}" height="6" fill="#f8fafc"/><text x="${w / 2}" y="${h - 10}" text-anchor="middle" font-size="${Math.max(9, Math.min(14, h - 8))}" font-weight="800" fill="#fca5a5">STOP</text>`);
    case 'entrada': case 'salida': { const k = e.tipo === 'entrada' ? '#38bdf8' : '#fbbf24';
      return wrap(`<rect width="${w}" height="${h}" rx="4" fill="${k}" fill-opacity=".18" stroke="${k}" stroke-width="2" stroke-dasharray="6 4"/><rect width="${w}" height="5" fill="url(#pt-barrier)"/><text x="${w / 2}" y="${h / 2 + 3}" dominant-baseline="middle" text-anchor="middle" font-size="${Math.min(12, h * 0.5)}" font-weight="800" fill="${k}">${esc(e.texto || e.tipo.toUpperCase())}</text>`); }
    case 'torre': return wrap(`<rect width="${w}" height="${h}" rx="8" fill="#0f172a" stroke="#22d3ee" stroke-width="2"/><text x="${w / 2}" y="${h / 2}" dominant-baseline="middle" text-anchor="middle" font-size="${Math.min(13, h * 0.35)}" font-weight="700" fill="#67e8f9">${esc(torreNombre(e.ref))}</text>`);
    case 'texto': return wrap(`<text x="${w / 2}" y="${h / 2}" dominant-baseline="middle" text-anchor="middle" font-size="${Math.min(22, h * 0.7)}" font-weight="700" fill="#e2e8f0">${esc(e.texto || 'Texto')}</text>`);
  }
  return '';
}
function mapaSvg(m, o = {}) {
  const res = new Set(o.resaltar || []);
  return `<svg class="plano" viewBox="0 0 ${m.ancho} ${m.alto}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Plano del parqueadero">${DEFS}<rect width="${m.ancho}" height="${m.alto}" rx="10" fill="#2a3547"/>
    ${m.elementos.map(elSvg).join('')}${m.celdas.map((c) => celdaSvg(c, { resaltar: res.has(c.idCelda) })).join('')}</svg>`;
}
// bloque reutilizable: selector Plano/Cuadrícula + mapa + leyenda
const vistaMapa = () => localStorage.getItem('mp_vista') || 'plano';
const selVista = () => `<div class="seg2 mini2" id="vm"><button data-v="plano" class="${vistaMapa() === 'plano' ? 'on' : ''}">${ic('layers')} Plano</button><button data-v="grid" class="${vistaMapa() === 'grid' ? 'on' : ''}">${ic('grid')} Cuadrícula</button></div>`;
const bindVista = () => $$('#vm button').forEach((b) => (b.onclick = () => { localStorage.setItem('mp_vista', b.dataset.v); go(S.view); }));
const mapaBloque = (m) => (vistaMapa() === 'plano' ? `<div class="planoWrap">${mapaSvg(m)}</div>` : grid(m.celdas));

const legend = `<div class="legend"><span><i class="libre"></i>Libre</span><span><i class="ocupada"></i>Ocupado</span><span><i class="mensual"></i>Mensual</span><span><i class="reservada"></i>Reservado</span></div>`;
const badge = (e) => `<span class="badge ${{ 'En parqueo': 'b-amber', Mensual: 'b-blue', 'Pagado/Salida': 'b-green', Pendiente: 'b-amber', Revisado: 'b-green', Aprobada: 'b-green', Rechazada: 'b-red' }[e] || 'b-blue'}">${esc(e)}</span>`;
const zonaSelect = () => `<select id="zona">${S.config.zonas.map((z) => `<option ${z === S.zona ? 'selected' : ''}>${esc(z)}</option>`).join('')}</select>`;
const bindZona = () => { const z = $('#zona'); if (z) z.onchange = () => { S.zona = z.value; go(S.view); }; };

// ------------------------------------------------------------------ login y registro
const DEMO = { administrador: ['admin@torrecentral.com', 'admin123'], guardia: ['guarda@torrecentral.com', 'guarda123'], residente: ['camilo@torrecentral.com', 'resi123'] };
function viewLogin(modo = 'login') {
  document.body.className = 'login';
  const feats = [['activity', 'Mapa de celdas en tiempo real'], ['map', 'Asignación por cercanía a tu torre'], ['shield', 'Acceso seguro por roles'], ['sheet', 'Reportes e importación en Excel']];
  $('#root').innerHTML = `<div class="auth"><section class="auth-hero"><div class="logo">${ic('parking')}</div><h1>Manage<span class="t">Parking</span></h1>
    <p>Gestión inteligente de parqueaderos para conjuntos residenciales.</p><ul>${feats.map((f) => `<li><span>${ic(f[0])}</span>${f[1]}</li>`).join('')}</ul></section>
    <section class="auth-card" id="authc"></section></div>`;
  modo === 'login' ? formLogin() : formRegistro();
}
function sesion(d) { S.token = d.token; S.user = d.user; localStorage.setItem('mp_token', d.token); localStorage.setItem('mp_user', JSON.stringify(d.user)); boot(); }
async function formLogin() {
  let modo = { demo: true, adminDemo: true }; try { modo = await api('/publico/modo'); } catch (e) { /* servidor antiguo: se asume demo */ }
  $('#authc').innerHTML = `<h2>Bienvenido</h2><p class="muted">Ingresa a tu cuenta</p>
    <ion-segment id="rol" value="administrador"><ion-segment-button value="administrador"><ion-label>Admin</ion-label></ion-segment-button>
    <ion-segment-button value="guardia"><ion-label>Guardia</ion-label></ion-segment-button><ion-segment-button value="residente"><ion-label>Residente</ion-label></ion-segment-button></ion-segment>
    <label class="l">Usuario</label><input class="f" id="correo" placeholder="usuario@conjunto.com" autocomplete="username">
    <label class="l">Contraseña</label><input class="f" id="clave" type="password" placeholder="••••••••" autocomplete="current-password">
    <button class="btn teal block" id="entrar">Iniciar sesión</button>
    <p class="center"><a id="olvido">¿Olvidaste tu contraseña?</a></p>
    <div class="sep"><span>¿Eres residente y no tienes cuenta?</span></div>
    <button class="btn line block" id="ir_reg">${ic('user')} Crear cuenta de residente</button>
    <p class="hint">Las cuentas de administrador están preconfiguradas por seguridad y las de guardia las crea el administrador.${modo.demo ? ' Demo: al elegir un perfil se rellenan los datos.' : ''}</p>`;
  const rellenar = (r) => { const ok = modo.demo && (r !== 'administrador' || modo.adminDemo); $('#correo').value = ok ? DEMO[r][0] : ''; $('#clave').value = ok ? DEMO[r][1] : ''; };
  rellenar('administrador');
  $('#rol').addEventListener('ionChange', (e) => rellenar(e.detail.value));
  $('#olvido').onclick = () => toast('Recuperación de contraseña: pendiente de implementar', 'medium');
  $('#ir_reg').onclick = () => viewLogin('registro');
  const entrar = run(async () => sesion(await api('/login', 'POST', { correo: $('#correo').value, password: $('#clave').value, rol: $('#rol').value })));
  $('#entrar').onclick = entrar; $('#clave').onkeydown = (e) => e.key === 'Enter' && entrar();
}
async function formRegistro() {
  let pub = { torres: [], conjunto: '' }; try { pub = await api('/publico/torres'); } catch (e) { toast(e.message, 'danger'); }
  $('#authc').innerHTML = `<h2>Crea tu cuenta</h2><p class="muted">${esc(pub.conjunto)} · registro exclusivo para residentes</p>
    <div class="cols"><div><label class="l">Nombre completo</label><input class="f" id="r_nombre" autocomplete="name"></div>
    <div><label class="l">Correo</label><input class="f" id="r_correo" type="email" autocomplete="email"></div>
    <div><label class="l">Teléfono</label><input class="f" id="r_tel" type="tel" placeholder="+57 300 000 0000"></div>
    <div><label class="l">Placa del vehículo</label><input class="f" id="r_placa" placeholder="ABC-123" maxlength="7" style="text-transform:uppercase"></div>
    <div><label class="l">Torre</label><select class="f" id="r_torre">${pub.torres.map((t) => `<option value="${t.idTorre}">${esc(t.nombre)}</option>`).join('')}</select></div>
    <div><label class="l">Apartamento</label><input class="f" id="r_apto" placeholder="502"></div>
    <div><label class="l">Contraseña</label><input class="f" id="r_clave" type="password" autocomplete="new-password" placeholder="Mínimo 6 caracteres"></div>
    <div><label class="l">Confirmar contraseña</label><input class="f" id="r_clave2" type="password" autocomplete="new-password"></div></div>
    <label class="check"><input type="checkbox" id="r_aut"><span>Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012.</span></label>
    <button class="btn teal block" id="r_ok">Crear cuenta</button>
    <p class="center"><a id="r_back">${ic('left')} Ya tengo cuenta</a></p>`;
  $('#r_back').onclick = () => viewLogin('login');
  $('#r_ok').onclick = run(async () => {
    const v = (id) => $('#' + id).value;
    if (v('r_clave') !== v('r_clave2')) throw new Error('Las contraseñas no coinciden');
    const d = await api('/registro', 'POST', { nombre: v('r_nombre'), correo: v('r_correo'), telefono: v('r_tel'), torre: v('r_torre'), apartamento: v('r_apto'), placa: v('r_placa'), password: v('r_clave'), autorizo: $('#r_aut').checked });
    toast('¡Cuenta creada! Bienvenido a Manage Parking', 'success'); sesion(d);
  });
}
function logout() { localStorage.clear(); S.token = null; S.user = null; viewLogin(); }

// ------------------------------------------------------------------ estructura por rol
const NAV = {
  administrador: [['tiempo', 'activity', 'Tiempo real'], ['perfil', 'user', 'Perfil'], ['historial', 'clock', 'Historial'], ['excel', 'sheet', 'Excel'], ['mapa2d', 'map', 'Mapa 2D'], ['edicion', 'sliders', 'Edición']],
  guardia: [['mapa', 'map', 'Mapa'], ['ingreso', 'plus', 'Ingreso'], ['salida', 'wallet', 'Salida'], ['perfil', 'user', 'Perfil']],
  residente: [['inicio', 'home', 'Inicio'], ['recibos', 'file', 'Recibos'], ['cupo', 'parking', 'Cupo'], ['perfil', 'user', 'Perfil']],
};
const brand = `<span class="mini">${ic('parking')}</span><b class="brand">Manage<span>Parking</span></b>`;
const dbChip = () => { const p = S.config.persistencia || 'memoria', n = { postgres: 'PostgreSQL', mysql: 'MySQL', sqlite: 'SQLite' }[p];
  return p === 'memoria' ? '<span class="dbchip warn" title="Los datos se pierden al reiniciar el servidor">● Datos en memoria</span>' : `<span class="dbchip ok" title="Los datos se guardan en la base de datos">● BD ${n}</span>`; };
function shell() {
  const rol = S.user.rol, nav = NAV[rol], btn = (n) => `<button data-nav="${n[0]}">${ic(n[1])}<span>${n[2]}</span></button>`;
  document.body.className = rol === 'administrador' ? 'admin' : 'mobile';
  if (rol === 'administrador') {
    $('#root').innerHTML = `<header class="topbar"><button class="burger" id="burger">${ic('menu')}</button>${brand}
      ${dbChip()}<div class="who"><i>${esc(S.user.nombre[0])}</i><div><b>${esc(S.user.nombre)}</b><small>Administrador · ${esc(S.config.conjunto.replace('Conjunto ', ''))}</small></div></div></header>
      <div class="layout"><aside class="side"><small class="sidelabel">MENÚ</small>${nav.map(btn).join('')}<button id="salir" class="out">${ic('power')}<span>Salir</span></button></aside><main id="view" class="main"></main></div>`;
    $('#burger').onclick = () => document.body.classList.toggle(innerWidth < 800 ? 'side-open' : 'side-closed');
    $('#salir').onclick = logout;
  } else {
    const cab = rol === 'residente' ? `<div class="av">${esc(S.user.nombre[0])}</div><div class="hola"><small>Bienvenido</small><b>Hola, ${esc(S.user.nombre.split(' ')[0])}</b></div>` : `${brand}`;
    $('#root').innerHTML = `<div class="phone"><header class="topbar">${cab}<button class="burger spacer" id="salir" title="Cerrar sesión">${ic('power')}</button></header><main id="view"></main>
      <nav class="tabbar">${nav.map(btn).join('')}</nav></div>`;
    $('#salir').onclick = async () => { if (await confirmar('¿Cerrar sesión?')) logout(); };
  }
  $$('[data-nav]').forEach((b) => (b.onclick = () => go(b.dataset.nav)));
}
async function go(v) {
  if (S.view === 'mapa2d' && S.sucio && !(await confirmar('Hay cambios sin guardar en el mapa. ¿Salir sin guardar?'))) return;
  if (S.cleanup) { S.cleanup(); S.cleanup = null; }
  S.view = v; document.body.classList.remove('side-open');
  $$('[data-nav]').forEach((b) => b.classList.toggle('on', b.dataset.nav === v));
  try { await VIEWS[v](); window.scrollTo(0, 0); $('#view').scrollTop = 0; } catch (e) { toast(e.message, 'danger'); }
}
async function boot() {
  if (!S.token) return viewLogin();
  try { S.config = await api('/config'); } catch { return; }
  S.zona = S.config.zonas[0]; shell(); go(NAV[S.user.rol][0][0]);
}

// ------------------------------------------------------------------ vistas
const VIEWS = {};

// 1 · Administrador · Parqueadero en tiempo real
VIEWS.tiempo = async () => {
  const [d, m] = await Promise.all([api('/dashboard?zona=' + enc(S.zona)), api('/mapa?zona=' + enc(S.zona))]);
  $('#view').innerHTML = `<h2>Parqueadero en tiempo real</h2><p class="muted">Turno activo · Guardia: ${esc(d.guardiaActivo.nombre)} · ${esc(d.guardiaActivo.turno)}</p>
    <div class="kpis">${kpi('car', 'ok', d.libres, 'Cupos libres')}${kpi('parking', 'bad', d.ocupados, 'Ocupados')}${kpi('users', 'men', d.visitantesHoy, 'Visitantes hoy')}${kpi('coin', 'warn', money(d.recaudoTurno), 'Recaudo turno')}</div>
    <div class="row"><div class="vista">Vista: ${zonaSelect()}</div><div class="spacer">${selVista()}</div></div>${mapaBloque(m)}${legend}
    <h4>Registrados por el guardia activo</h4><div class="scroll"><table class="tbl"><tr><th>Placa</th><th>Tipo</th><th>Espacio</th><th>Ingreso</th><th>Estado</th></tr>
    ${d.registrados.map((a) => `<tr><td>${esc(a.placa)}</td><td>${a.clase === 'residente' ? 'Residente' : 'Visitante'}</td><td>${esc(a.celda)}</td><td>${hm(a.entrada)}</td><td>${badge(a.estado)}</td></tr>`).join('') || '<tr><td colspan="5">Sin registros en este turno</td></tr>'}</table></div>`;
  bindZona(); bindVista();
};

// Perfil (admin, guardia y residente)
VIEWS.perfil = async () => {
  const p = await api('/perfil'), adm = S.user.rol === 'administrador';
  $('#view').innerHTML = `<h2>${adm ? 'Perfil del administrador' : 'Mi perfil'}</h2><p class="muted">${adm ? 'Información personal y del conjunto' : 'Datos de la cuenta y credenciales'}</p>
    <div class="card"><div class="cols"><div><label class="l">Nombre</label><input class="f" id="p_nombre" value="${esc(p.nombre)}"></div>
    ${adm ? `<div><label class="l">Conjunto</label><input class="f" id="p_conjunto" value="${esc(p.conjunto)}"></div>` : `<div><label class="l">Rol</label><input class="f" disabled value="${esc(p.rol)}"></div>`}
    <div><label class="l">Correo</label><input class="f" id="p_correo" value="${esc(p.correo)}"></div>
    <div><label class="l">${adm ? 'Rol' : 'Teléfono'}</label>${adm ? '<input class="f" disabled value="Administrador general">' : `<input class="f" id="p_tel" value="${esc(p.telefono)}">`}</div>
    ${adm ? `<div><label class="l">Teléfono</label><input class="f" id="p_tel" value="${esc(p.telefono)}"></div>` : ''}
    <div><label class="l">Contraseña (dejar vacío para no cambiar)</label><input class="f" id="p_clave" type="password" placeholder="••••••••"></div></div>
    <button class="btn teal" style="margin-top:16px" id="guardar">Guardar cambios</button></div>
    ${adm ? '' : '<button class="btn line block" id="cerrar">Cerrar sesión</button>'}`;
  $('#guardar').onclick = run(async () => {
    const r = await api('/perfil', 'PUT', { nombre: $('#p_nombre').value, correo: $('#p_correo').value, telefono: $('#p_tel').value, conjunto: $('#p_conjunto')?.value, password: $('#p_clave').value || undefined });
    S.user = r.user; localStorage.setItem('mp_user', JSON.stringify(r.user)); $('#p_clave').value = ''; toast('Cambios guardados', 'success');
  });
  const c = $('#cerrar'); if (c) c.onclick = logout;
};

// 3 · Historial del parqueadero
VIEWS.historial = async () => {
  const h = await api('/historial'), gs = h.turnos.map((t) => t.nombre);
  $('#view').innerHTML = `<h2>Historial del parqueadero</h2><div class="row" style="margin:6px 0 14px"><span class="muted" style="margin:0">Filtros:</span>
    <select class="f" style="width:auto" id="f_fecha"><option value="mes">Último mes</option><option value="hoy">Hoy</option></select>
    <select class="f" style="width:auto" id="f_guardia"><option value="">Todos los guardias</option>${gs.map((g) => `<option>${esc(g)}</option>`).join('')}</select>
    <select class="f" style="width:auto" id="f_tipo"><option value="">Todos los tipos</option><option>Visitante</option><option>Residente</option></select></div>
    <div class="kpis k3">${kpi('car', 'men', h.kpis.vehiculos, 'Vehículos (mes)')}${kpi('coin', 'ok', money(h.kpis.recaudo), 'Recaudo total')}${kpi('shield', 'warn', h.kpis.guardias, 'Guardias activos')}</div>
    <h4>Turnos de guardias</h4><div class="scroll"><table class="tbl"><tr><th>Guardia</th><th>Turno</th><th>Vehículos</th><th>Recaudo</th></tr>
    ${h.turnos.map((t) => `<tr><td>${esc(t.nombre)}</td><td>${esc(t.turno)}</td><td>${t.vehiculos}</td><td>${money(t.recaudo)}</td></tr>`).join('')}</table></div>
    <h4>Vehículos registrados</h4><div class="scroll"><table class="tbl" id="tv"></table></div>`;
  const pintar = () => {
    const f = { fecha: $('#f_fecha').value, g: $('#f_guardia').value, t: $('#f_tipo').value };
    const l = h.vehiculos.filter((a) => (!f.g || a.guardia === f.g) && (!f.t || (a.clase === 'residente' ? 'Residente' : 'Visitante') === f.t) && (f.fecha === 'mes' || new Date(a.entrada).toDateString() === new Date().toDateString()));
    $('#tv').innerHTML = `<tr><th>Placa</th><th>Tipo</th><th>Mensualidad</th><th>Guardia</th><th>Ingreso</th><th>Salida</th><th>Cobro</th></tr>` +
      (l.map((a) => `<tr><td>${esc(a.placa)}</td><td>${a.clase === 'residente' ? 'Residente' : 'Visitante'}</td><td>${a.mensualidad ? 'Sí' : 'No'}</td><td>${esc(ab(a.guardia))}</td><td>${dm(a.entrada)} ${hm(a.entrada)}</td><td>${a.salida ? hm(a.salida) : '—'}</td><td>${a.salida && a.valor ? money(a.valor) : '—'}</td></tr>`).join('') || '<tr><td colspan="7">Sin resultados</td></tr>');
  };
  ['#f_fecha', '#f_guardia', '#f_tipo'].forEach((s) => ($(s).onchange = pintar)); pintar();
};

// 4 · Excel (importar / exportar, tabla editable)
VIEWS.excel = async () => {
  let rows = await api('/excel');
  $('#view').innerHTML = `<div class="row"><div><h2>Reportes · Excel</h2><p class="muted">Datos editables en línea</p></div><div class="spacer row">
    <label class="btn line sm" for="imp">${ic('up')} Importar</label><input type="file" id="imp" accept=".xlsx,.xls,.csv" hidden>
    <button class="btn teal sm" id="exp">${ic('down')} Exportar .xlsx</button><button class="btn line sm" id="csv">.csv</button></div></div>
    <div class="scroll"><table class="tbl"><tr><th>#</th><th>Placa</th><th>Tipo</th><th>Guardia</th><th>Fecha</th><th>Recaudo</th><th></th></tr>
    ${rows.map((r, i) => `<tr data-id="${r.id}"><td>${i + 1}</td><td><input data-k="placa" value="${esc(r.placa)}"></td><td><input data-k="tipo" value="${esc(r.tipo)}"></td>
    <td><input data-k="guardia" value="${esc(ab(r.guardia))}"></td><td>${esc(r.fecha)}</td><td><input data-k="recaudo" value="${r.recaudo ? money(r.recaudo) : '—'}"></td><td class='mu'>${ic('edit')}</td></tr>`).join('')}</table></div>
    <p class="muted" style="margin-top:10px">Compatible con formato .xlsx / .csv · Sincroniza guardias, vehículos y recaudo.</p>`;
  $$('.tbl input').forEach((i) => (i.onchange = run(async () => {
    const tr = i.closest('tr'); await api('/excel/' + tr.dataset.id, 'PUT', { [i.dataset.k]: i.value }); toast('Registro actualizado', 'success');
  })));
  const hoja = () => { const aoa = [['#', 'Placa', 'Tipo', 'Guardia', 'Fecha', 'Recaudo'], ...rows.map((r, i) => [i + 1, r.placa, r.tipo, r.guardia, r.fecha, r.recaudo || 0])];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Reportes'); return wb; };
  const need = () => { if (typeof XLSX === 'undefined') throw new Error('No se cargó la librería XLSX (revisa tu conexión a internet)'); };
  $('#exp').onclick = run(() => { need(); XLSX.writeFile(hoja(), 'manage-parking-reportes.xlsx'); });
  $('#csv').onclick = run(() => { need(); XLSX.writeFile(hoja(), 'manage-parking-reportes.csv', { bookType: 'csv' }); });
  $('#imp').onchange = run(async (e) => {
    need(); const f = e.target.files[0]; if (!f) return;
    const wb = XLSX.read(await f.arrayBuffer()); const filas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const r = await api('/excel/importar', 'POST', { filas }); toast(`Importados: ${r.importados}` + (r.errores.length ? ` · Errores: ${r.errores.length}` : ''), r.errores.length ? 'warning' : 'success'); VIEWS.excel();
  });
};

// 5 · Editor de mapa 2D: crear y editar la estructura del parqueadero (solo administrador)
const TOOLS = [['sel', 'cursor', 'Seleccionar'], ['mano', 'hand', 'Mover vista'], ['celda', 'car', 'Celda'], ['isla', 'square', 'Isla'], ['planta', 'tree', 'Planta'], ['flecha', 'arrowup', 'Sentido'], ['entrada', 'door', 'Entrada'],
  ['salida', 'door', 'Salida'], ['stop', 'octagon', 'Stop'], ['cruce', 'zebra', 'Cruce'], ['torre', 'building', 'Torre'], ['muro', 'minus', 'Muro'], ['texto', 'type', 'Texto']];
const DEF = { celda: { w: 60, h: 90, rot: 0, tipo: 'carro', estado: 'libre', placa: null, propietario: null }, isla: { tipo: 'isla', w: 120, h: 40 }, planta: { tipo: 'planta', w: 50, h: 50 },
  flecha: { tipo: 'flecha', w: 40, h: 60, rot: 0 }, entrada: { tipo: 'entrada', w: 140, h: 22, texto: 'ENTRADA' }, salida: { tipo: 'salida', w: 140, h: 22, texto: 'SALIDA' },
  stop: { tipo: 'stop', w: 100, h: 22 }, cruce: { tipo: 'cruce', w: 120, h: 30 }, torre: { tipo: 'torre', w: 70, h: 40, ref: 1 }, muro: { tipo: 'muro', w: 200, h: 8 }, texto: { tipo: 'texto', w: 120, h: 28, texto: 'Texto' } };
const NOMBRE_EL = { isla: 'Isla / jardinera', planta: 'Planta', muro: 'Muro', flecha: 'Flecha de sentido', cruce: 'Cruce peatonal', stop: 'Stop', entrada: 'Entrada', salida: 'Salida', torre: 'Acceso a torre', texto: 'Texto' };
function pedirOpcion(header, opciones) {
  return new Promise(async (res) => {
    const a = document.createElement('ion-alert'); a.header = header;
    a.inputs = opciones.map((o, i) => ({ type: 'radio', label: o.label, value: o.value, checked: i === 0 }));
    a.buttons = [{ text: 'Cancelar', role: 'cancel', handler: () => res(null) }, { text: 'Aceptar', handler: (v) => res(v) }];
    a.addEventListener('didDismiss', () => res(null)); document.body.appendChild(a); await a.present();
  });
}

VIEWS.mapa2d = async () => {
  if (S.cleanup) { S.cleanup(); S.cleanup = null; }
  const [m, plantillas] = await Promise.all([api('/mapa?zona=' + enc(S.zona)), api('/plantillas')]);
  const E = { ancho: m.ancho, alto: m.alto, celdas: m.celdas.map((c) => ({ ...c, _id: 'c' + c.idCelda })), elementos: m.elementos.map((e, i) => ({ ...e, _id: 'e' + i })),
    sel: new Set(), zoom: Math.min(1, Math.round(900 / m.ancho * 10) / 10), snap: 10, tool: 'sel', hist: [], hi: -1, uid: 1000, band: null };
  S.sucio = false;
  let drag = null;
  const esCelda = (i) => i._id[0] === 'c';
  const items = () => [...E.celdas, ...E.elementos];
  const sel = () => items().filter((i) => E.sel.has(i._id));
  const sn = (v) => (E.snap ? Math.round(v / E.snap) * E.snap : Math.round(v));
  const clamp = (it) => { it.x = Math.max(0, Math.min(E.ancho - it.w, it.x)); it.y = Math.max(0, Math.min(E.alto - it.h, it.y)); };
  const foto = () => JSON.stringify({ a: E.ancho, h: E.alto, c: E.celdas, e: E.elementos });
  const commit = () => { E.hist = E.hist.slice(0, E.hi + 1); E.hist.push(foto()); if (E.hist.length > 60) E.hist.shift(); E.hi = E.hist.length - 1; S.sucio = E.hi !== 0; };
  const restaurar = (i) => { const o = JSON.parse(E.hist[i]); E.ancho = o.a; E.alto = o.h; E.celdas = o.c; E.elementos = o.e; E.hi = i; S.sucio = E.hi !== 0;
    const ids = new Set(items().map((x) => x._id)); E.sel = new Set([...E.sel].filter((k) => ids.has(k))); drawAll(); };
  const prefijo = (n) => (String(n).match(/^[^\d]*/) || [''])[0] || 'N';
  const sigNum = (pref) => { const re = new RegExp('^' + pref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d+)$', 'i'); let mx = 0;
    E.celdas.forEach((c) => { const k = String(c.numero).match(re); if (k) mx = Math.max(mx, +k[1]); }); return pref + (mx + 1); };

  // ---------- estructura de la pantalla
  $('#view').innerHTML = `<div class="row"><div><h2>Editor de mapa 2D</h2><p class="muted">Crea y edita la estructura del parqueadero · <span id="dirty"></span></p></div>
    <div class="spacer row">${zonaSelect()}<button class="btn line sm" id="z_nueva">${ic('plus')} Nueva zona</button><button class="btn line sm" id="z_ren" title="Renombrar zona">${ic('edit')}</button><button class="btn line sm" id="z_del" title="Eliminar zona">${ic('trash')}</button></div></div>
    <div class="row" style="margin:4px 0 10px"><button class="btn line sm" id="undo">${ic('undo')} Deshacer</button><button class="btn line sm" id="redo">${ic('redo')} Rehacer</button>
    <button class="btn line sm" id="zout" title="Alejar">−</button><button class="btn line sm" id="zfit" title="Ajustar al ancho">Ajustar</button><button class="btn line sm" id="zin" title="Acercar">+</button>
    <span class="spacer"></span><button class="btn teal sm" id="save">${ic('save')} Guardar mapa</button></div>
    <div class="ed2"><div class="tools">${TOOLS.map(([id, i, l]) => `<button class="tool ${id === 'sel' ? 'on' : ''}" data-t="${id}" title="${l}">${ic(i)}<span>${l}</span></button>`).join('')}</div>
    <div class="cv-wrap"><svg id="cv" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="pt-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#64748b" fill-opacity=".5"/></pattern></defs>
    <rect id="bg" fill="#2a3547"/><rect id="bgg" fill="url(#pt-grid)" pointer-events="none"/><g id="layer"></g></svg></div>
    <div class="side2"><div class="card" id="prop"></div>
    <div class="card"><b>Generar fila de celdas</b><div class="gridp">
      <div><label class="l">Prefijo</label><input class="f sm" id="g_pref" value="N"></div><div><label class="l">Desde</label><input class="f sm" id="g_desde" type="number" value="1"></div>
      <div><label class="l">Cantidad</label><input class="f sm" id="g_cant" type="number" value="6" min="1" max="40"></div>
      <div><label class="l">Tipo</label><select class="f sm" id="g_tipo"><option value="carro">Carro</option><option value="moto">Moto</option><option value="discapacidad">Accesible</option></select></div></div>
      <label class="l">Orientación</label><select class="f sm" id="g_ori"><option value="0">Vertical · frente arriba</option><option value="180">Vertical · frente abajo</option><option value="90">Horizontal · frente derecha</option><option value="270">Horizontal · frente izquierda</option></select>
      <button class="btn line sm block" id="gen">${ic('rows')} Generar</button></div></div></div>
    ${legend}<p class="muted">Desplazar: barras laterales, rueda del ratón, herramienta Mover, barra espaciadora + arrastrar, o un dedo sobre zona vacía · Ctrl+rueda zoom · Atajos: V seleccionar · R girar · Ctrl+D duplicar · Supr borrar · Ctrl+Z / Ctrl+Y · flechas mover · Mayús+clic selección múltiple · arrastra en vacío para seleccionar varias.</p>`;
  const cv = $('#cv'), layer = $('#layer');

  // ---------- dibujo
  const overlay = () => {
    const s = sel(); let o = s.map((i) => `<rect x="${i.x - 2}" y="${i.y - 2}" width="${i.w + 4}" height="${i.h + 4}" fill="none" stroke="#22d3ee" stroke-width="2" stroke-dasharray="6 4" pointer-events="none"/>`).join('');
    if (s.length === 1) o += `<rect data-h="1" x="${s[0].x + s[0].w - 8}" y="${s[0].y + s[0].h - 8}" width="16" height="16" rx="4" fill="#22d3ee" stroke="#0f172a" stroke-width="2" style="cursor:nwse-resize"/>`;
    if (E.band) { const b = E.band; o += `<rect x="${Math.min(b.x0, b.x1)}" y="${Math.min(b.y0, b.y1)}" width="${Math.abs(b.x1 - b.x0)}" height="${Math.abs(b.y1 - b.y0)}" fill="rgba(34,211,238,.12)" stroke="#22d3ee" stroke-dasharray="4 3" pointer-events="none"/>`; }
    return o;
  };
  const drawLayer = () => { layer.innerHTML = E.elementos.map(elSvg).join('') + E.celdas.map((c) => celdaSvg(c)).join('') + overlay(); };
  const drawCanvas = () => {
    cv.setAttribute('viewBox', `0 0 ${E.ancho} ${E.alto}`); cv.style.width = E.ancho * E.zoom + 'px'; cv.style.height = E.alto * E.zoom + 'px';
    ['bg', 'bgg'].forEach((id) => { const r = $('#' + id); r.setAttribute('width', E.ancho); r.setAttribute('height', E.alto); }); $('#bgg').style.display = E.snap ? '' : 'none';
  };
  const drawBar = () => { $('#dirty').innerHTML = S.sucio ? '<b style="color:#d97706">● cambios sin guardar</b>' : 'guardado'; $('#undo').disabled = E.hi <= 0; $('#redo').disabled = E.hi >= E.hist.length - 1;
    $$('.tool').forEach((b) => b.classList.toggle('on', b.dataset.t === E.tool)); cv.style.cursor = E.tool === 'mano' ? 'grab' : ''; };
  const campo = (p, label, val, extra = '') => `<div><label class="l">${label}</label><input class="f sm" data-p="${p}" type="number" value="${Math.round(val)}" ${extra}></div>`;
  const drawPanel = () => {
    const s = sel(), p = $('#prop');
    if (!s.length) {
      const n = (e) => E.celdas.filter((c) => c.estado === e).length;
      p.innerHTML = `<b>Plano · ${esc(S.zona)}</b><div class="gridp">${campo('ancho', 'Ancho', E.ancho, 'min="400" max="2000"')}${campo('alto', 'Alto', E.alto, 'min="300" max="2000"')}</div>
        <label class="l">Cuadrícula (ajuste)</label><select class="f sm" data-p="snap">${[[0, 'Libre'], [5, '5 px'], [10, '10 px'], [20, '20 px']].map(([v, l]) => `<option value="${v}" ${E.snap === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <label class="l">Zoom</label><input type="range" min="0.3" max="2" step="0.1" value="${E.zoom}" data-p="zoom" style="width:100%">
        <p class="muted" style="margin:12px 0 0">${E.celdas.length} celdas: ${n('libre')} libres · ${n('ocupada')} ocupadas · ${n('mensual')} mensuales · ${n('reservada')} reservadas</p>`;
    } else if (s.length === 1) {
      const it = s[0], c = esCelda(it);
      p.innerHTML = `<div class="row"><b>${c ? 'Celda ' + esc(it.numero) : NOMBRE_EL[it.tipo]}</b>${c ? `<span class="spacer badge ${{ libre: 'b-green', ocupada: 'b-red', mensual: 'b-blue', reservada: 'b-amber' }[it.estado] || 'b-green'}">${esc(it.estado)}</span>` : ''}</div>
        ${c ? `<div class="gridp"><div><label class="l">Número</label><input class="f sm" data-p="numero" value="${esc(it.numero)}" maxlength="8"></div>
        <div><label class="l">Tipo</label><select class="f sm" data-p="tipo">${[['carro', 'Carro'], ['moto', 'Moto'], ['discapacidad', 'Accesible']].map(([v, l]) => `<option value="${v}" ${it.tipo === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
        ${it.placa ? `<p class="muted" style="margin:6px 0 0">${esc(it.placa)} · ${esc(it.propietario || '')}</p>` : ''}` : ''}
        ${['texto', 'entrada', 'salida'].includes(it.tipo) ? `<label class="l">Texto</label><input class="f sm" data-p="texto" value="${esc(it.texto || '')}" maxlength="40">` : ''}
        ${it.tipo === 'torre' ? `<label class="l">Torre</label><select class="f sm" data-p="ref">${S.config.torres.map((t) => `<option value="${t.idTorre}" ${t.idTorre === Number(it.ref) ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}</select>` : ''}
        <div class="gridp">${campo('x', 'X', it.x)}${campo('y', 'Y', it.y)}${campo('w', 'Ancho', it.w, 'min="4"')}${campo('h', 'Alto', it.h, 'min="4"')}</div>
        ${c || it.tipo === 'flecha' ? `<label class="l">Orientación (hacia dónde mira)</label><div class="orient">${[[0, 'arrowup'], [90, 'arrowright'], [180, 'arrowdown'], [270, 'arrowleft']].map(([r, i]) => `<button class="${(it.rot || 0) === r ? 'on' : ''}" data-r="${r}">${ic(i)}</button>`).join('')}</div>` : ''}
        <div class="row" style="margin-top:12px"><button class="btn line sm" id="p_dup">${ic('copy')} Duplicar</button><button class="btn line sm" id="p_rot">${ic('rotate')} Girar</button><button class="btn line sm" id="p_del">${ic('trash')}</button></div>`;
    } else {
      const nc = s.filter(esCelda).length;
      p.innerHTML = `<b>${s.length} elementos seleccionados</b><p class="muted" style="margin:4px 0 0">Arrástralos juntos o usa las acciones.</p>
        <div class="row" style="margin-top:12px"><button class="btn line sm" id="p_dup">${ic('copy')} Duplicar</button><button class="btn line sm" id="p_rot">${ic('rotate')} Girar</button><button class="btn line sm" id="p_del">${ic('trash')}</button></div>
        ${nc ? `<button class="btn line sm block" id="p_num">${ic('type')} Renumerar ${nc} celdas…</button>` : ''}`;
    }
    $$('#prop [data-p]').forEach((i) => (i.onchange = () => {
      const k = i.dataset.p; let v = i.type === 'number' || k === 'ref' || k === 'snap' ? Number(i.value) : i.value;
      if (k === 'zoom') { E.zoom = Number(i.value); return drawCanvas(); } if (k === 'snap') { E.snap = v; return drawAll(); }
      if (k === 'ancho' || k === 'alto') { E[k] = Math.max(k === 'ancho' ? 400 : 300, Math.min(2000, v || 400)); } else {
        const it = s[0]; if (k === 'numero') v = String(v).trim(); if (['w', 'h'].includes(k)) v = Math.max(4, v || 4); it[k] = v; if (k !== 'numero' && k !== 'tipo' && k !== 'texto' && k !== 'ref') clamp(it); }
      commit(); drawAll();
    }));
    $$('#prop .orient button').forEach((b) => (b.onclick = () => { orientar(s[0], Number(b.dataset.r)); commit(); drawAll(); }));
    const bind = (id, fn) => { const e = $('#' + id); if (e) e.onclick = fn; };
    bind('p_dup', duplicar); bind('p_rot', rotar90); bind('p_del', borrar); bind('p_num', renumerar);
  };
  const drawAll = () => { drawCanvas(); drawLayer(); drawPanel(); drawBar(); };

  // ---------- acciones
  const orientar = (it, r) => { if ((it.rot || 0) % 180 !== r % 180) [it.w, it.h] = [it.h, it.w]; it.rot = r; clamp(it); };
  const rotar90 = () => { sel().forEach((i) => { if (esCelda(i) || i.tipo === 'flecha') orientar(i, ((i.rot || 0) + 90) % 360); else { [i.w, i.h] = [i.h, i.w]; clamp(i); } }); commit(); drawAll(); };
  const borrar = () => {
    const s = sel(); if (!s.length) return;
    const bloq = s.filter((i) => esCelda(i) && i.estado && i.estado !== 'libre');
    if (bloq.length) return toast(`No se puede eliminar ${bloq.map((c) => c.numero + ' (' + c.estado + ')').join(', ')}: la celda no está libre`, 'warning');
    E.celdas = E.celdas.filter((c) => !E.sel.has(c._id)); E.elementos = E.elementos.filter((e) => !E.sel.has(e._id)); E.sel.clear(); commit(); drawAll();
  };
  const duplicar = () => {
    const s = sel(); if (!s.length) return; const nuevos = [];
    s.forEach((i) => { const c = { ...i, _id: (esCelda(i) ? 'c' : 'e') + 'n' + E.uid++, x: i.x + 20, y: i.y + 20 }; clamp(c);
      if (esCelda(i)) { delete c.idCelda; Object.assign(c, { estado: 'libre', placa: null, propietario: null, numero: sigNum(prefijo(i.numero)) }); E.celdas.push(c); } else E.elementos.push(c); nuevos.push(c._id); });
    E.sel = new Set(nuevos); commit(); drawAll();
  };
  const crear = (tipo, pt) => {
    const d = DEF[tipo], c = tipo === 'celda', it = { ...d, _id: (c ? 'c' : 'e') + 'n' + E.uid++ };
    if (c) { const ult = sel().filter(esCelda)[0] || E.celdas[E.celdas.length - 1]; it.numero = sigNum(ult ? prefijo(ult.numero) : 'N'); }
    it.x = sn(pt.x - it.w / 2); it.y = sn(pt.y - it.h / 2); clamp(it); (c ? E.celdas : E.elementos).push(it);
    E.sel = new Set([it._id]); E.tool = 'sel'; commit(); drawAll();
  };
  const renumerar = run(async () => {
    const cs = sel().filter(esCelda); if (!cs.length) return;
    const v = await pedir('Renumerar celdas seleccionadas', [{ name: 'pref', value: prefijo(cs[0].numero), placeholder: 'Prefijo' }, { name: 'desde', type: 'number', value: 1, placeholder: 'Número inicial' }], 'Renumerar'); if (!v) return;
    [...cs].sort((a, b) => a.y - b.y || a.x - b.x).forEach((c, i) => (c.numero = v.pref + (Number(v.desde) + i))); commit(); drawAll();
  });
  $('#gen').onclick = run(() => {
    const p = ($('#g_pref').value || 'N').trim(), d = Math.round(+$('#g_desde').value) || 1, n = Math.max(1, Math.min(40, Math.round(+$('#g_cant').value) || 1));
    const rot = +$('#g_ori').value, tipo = $('#g_tipo').value, vert = rot % 180 === 0, w = vert ? 60 : 90, h = vert ? 90 : 52, paso = vert ? w + 6 : h + 4;
    const nums = Array.from({ length: n }, (_, i) => p + (d + i)), dup = nums.filter((x) => E.celdas.some((c) => String(c.numero).toLowerCase() === x.toLowerCase()));
    if (dup.length) throw new Error('Ya existen las celdas: ' + dup.slice(0, 5).join(', ') + (dup.length > 5 ? '…' : ''));
    const x0 = vert ? sn(E.ancho / 2 - (n * paso) / 2) : sn(E.ancho / 2 - w / 2), y0 = vert ? sn(E.alto / 2 - h / 2) : sn(E.alto / 2 - (n * paso) / 2), nuevos = [];
    nums.forEach((numero, i) => { const c = { _id: 'cn' + E.uid++, numero, x: vert ? x0 + i * paso : x0, y: vert ? y0 : y0 + i * paso, w, h, rot, tipo, estado: 'libre', placa: null, propietario: null }; clamp(c); E.celdas.push(c); nuevos.push(c._id); });
    E.sel = new Set(nuevos); commit(); drawAll(); toast(`${n} celdas generadas: arrástralas a su lugar`, 'success');
  });

  // ---------- ratón / táctil (todo sobre el SVG: el redibujo no rompe la captura del puntero)
  const pos = (ev) => { const r = cv.getBoundingClientRect(); return { x: ((ev.clientX - r.left) * E.ancho) / r.width, y: ((ev.clientY - r.top) * E.alto) / r.height }; };
  cv.onpointerdown = (ev) => {
    if (ev.button > 1) return; const pt = pos(ev);
    const sobreItem = !!ev.target.closest('[data-k],[data-h]');
    // desplazar la vista: herramienta Mover, barra espaciadora, botón central, o un dedo sobre zona vacía (táctil)
    if (ev.button === 1 || E.espacio || E.tool === 'mano' || (ev.pointerType === 'touch' && !sobreItem && E.tool === 'sel')) {
      ev.preventDefault(); cv.setPointerCapture(ev.pointerId); const w = $('.cv-wrap'); cv.style.cursor = 'grabbing';
      drag = { modo: 'pan', sx: ev.clientX, sy: ev.clientY, sl: w.scrollLeft, st: w.scrollTop }; return;
    }
    if (E.tool !== 'sel') return crear(E.tool, pt);
    cv.setPointerCapture(ev.pointerId);
    if (ev.target.closest('[data-h]')) { const it = sel()[0]; drag = { modo: 'size', it, x0: pt.x, y0: pt.y, w0: it.w, h0: it.h }; return; }
    const k = ev.target.closest('[data-k]')?.dataset.k;
    if (k) {
      if (ev.shiftKey) { E.sel.has(k) ? E.sel.delete(k) : E.sel.add(k); } else if (!E.sel.has(k)) E.sel = new Set([k]);
      drag = { modo: 'mover', x0: pt.x, y0: pt.y, orig: new Map(sel().map((i) => [i._id, { x: i.x, y: i.y }])), movido: false };
    } else { if (!ev.shiftKey) E.sel = new Set(); drag = { modo: 'banda', x0: pt.x, y0: pt.y, base: new Set(E.sel) }; }
    drawLayer(); drawPanel();
  };
  cv.onpointermove = (ev) => {
    if (!drag) return;
    if (drag.modo === 'pan') { const w = $('.cv-wrap'); w.scrollLeft = drag.sl - (ev.clientX - drag.sx); w.scrollTop = drag.st - (ev.clientY - drag.sy); return; }
    const pt = pos(ev), dx = pt.x - drag.x0, dy = pt.y - drag.y0;
    if (drag.modo === 'mover') { if (!drag.movido && Math.hypot(dx, dy) < 3) return; drag.movido = true;
      sel().forEach((i) => { const o = drag.orig.get(i._id); i.x = sn(o.x + dx); i.y = sn(o.y + dy); clamp(i); }); drawLayer(); }
    else if (drag.modo === 'size') { drag.it.w = Math.max(20, sn(drag.w0 + dx)); drag.it.h = Math.max(20, sn(drag.h0 + dy)); if (!esCelda(drag.it)) { drag.it.w = Math.max(4, drag.it.w); } clamp(drag.it); drag.cambio = true; drawLayer(); }
    else if (drag.modo === 'banda') { E.band = { x0: drag.x0, y0: drag.y0, x1: pt.x, y1: pt.y }; drawLayer(); }
  };
  cv.onpointerup = () => {
    if (!drag) return;
    if (drag.modo === 'pan') { drag = null; cv.style.cursor = E.tool === 'mano' ? 'grab' : ''; return; }
    if (drag.modo === 'mover' && drag.movido) commit();
    if (drag.modo === 'size' && drag.cambio) commit();
    if (drag.modo === 'banda' && E.band) { const b = E.band, x0 = Math.min(b.x0, b.x1), x1 = Math.max(b.x0, b.x1), y0 = Math.min(b.y0, b.y1), y1 = Math.max(b.y0, b.y1);
      if (x1 - x0 > 4 || y1 - y0 > 4) E.sel = new Set([...drag.base, ...items().filter((i) => i.x < x1 && i.x + i.w > x0 && i.y < y1 && i.y + i.h > y0).map((i) => i._id)]); E.band = null; }
    drag = null; drawAll();
  };
  cv.oncontextmenu = (e) => e.preventDefault();
  cv.onpointercancel = () => { drag = null; E.band = null; cv.style.cursor = ''; drawAll(); };

  // ---------- barra de herramientas, zonas y guardado
  $$('.tool').forEach((b) => (b.onclick = () => { E.tool = b.dataset.t; drawBar(); }));
  const zoomA = (z) => { E.zoom = Math.max(0.2, Math.min(2, Math.round(z * 10) / 10)); drawCanvas(); drawPanel(); };
  $('#zin').onclick = () => zoomA(E.zoom + 0.1); $('#zout').onclick = () => zoomA(E.zoom - 0.1);
  $('#zfit').onclick = () => zoomA(Math.floor((($('.cv-wrap').clientWidth - 40) / E.ancho) * 10) / 10);
  $('.cv-wrap').addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomA(E.zoom + (e.deltaY < 0 ? 0.1 : -0.1)); } }, { passive: false }); // rueda normal = desplazar; Ctrl+rueda = zoom
  $('#undo').onclick = () => E.hi > 0 && restaurar(E.hi - 1); $('#redo').onclick = () => E.hi < E.hist.length - 1 && restaurar(E.hi + 1);
  const okSalir = async () => !S.sucio || (await confirmar('Hay cambios sin guardar en el mapa. ¿Continuar sin guardar?'));
  bindZona(); $('#zona').onchange = async () => { if (!(await okSalir())) { $('#zona').value = S.zona; return; } S.sucio = false; S.zona = $('#zona').value; go('mapa2d'); };
  $('#z_nueva').onclick = run(async () => {
    if (!(await okSalir())) return;
    const v = await pedir('Nueva zona (mapa)', [{ name: 'nombre', placeholder: 'Ej. Sótano 3' }], 'Siguiente'); if (!v || !v.nombre) return;
    const pl = await pedirOpcion('Plantilla inicial', plantillas.map((p) => ({ label: `${p.nombre} — ${p.descripcion}`, value: p.id }))); if (!pl) return;
    await api('/zonas', 'POST', { nombre: v.nombre, plantilla: pl }); S.sucio = false; S.config = await api('/config'); S.zona = v.nombre.trim().replace(/\s+/g, ' '); toast('Zona creada: ya puedes editar su mapa', 'success'); go('mapa2d');
  });
  $('#z_ren').onclick = run(async () => {
    const v = await pedir('Renombrar zona', [{ name: 'nombre', value: S.zona }]); if (!v || !v.nombre) return;
    const r = await api('/zonas/' + enc(S.zona), 'PUT', { nombre: v.nombre }); S.sucio = false; S.config = await api('/config'); S.zona = r.nombre; go('mapa2d');
  });
  $('#z_del').onclick = run(async () => {
    if (!(await confirmar(`¿Eliminar la zona "${S.zona}" y todo su mapa? Solo es posible si todas sus celdas están libres.`))) return;
    await api('/zonas/' + enc(S.zona), 'DELETE'); S.sucio = false; S.config = await api('/config'); S.zona = S.config.zonas[0]; toast('Zona eliminada', 'success'); go('mapa2d');
  });
  $('#save').onclick = run(async () => {
    await api('/mapa', 'PUT', { zona: S.zona, ancho: E.ancho, alto: E.alto,
      celdas: E.celdas.map((c) => ({ idCelda: c.idCelda, numero: c.numero, x: c.x, y: c.y, w: c.w, h: c.h, rot: c.rot || 0, tipo: c.tipo })),
      elementos: E.elementos.map((e) => ({ tipo: e.tipo, x: e.x, y: e.y, w: e.w, h: e.h, rot: e.rot || 0, texto: e.texto, ref: e.ref })) });
    S.sucio = false; toast('Mapa guardado: ya se ve en todas las pantallas', 'success'); VIEWS.mapa2d();
  });

  // ---------- teclado
  const kb = (e) => {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || document.querySelector('ion-alert')) return;
    if (e.code === 'Space') { e.preventDefault(); E.espacio = true; cv.style.cursor = 'grab'; return; }
    const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase(), paso = (E.snap || 1) * (e.shiftKey ? 5 : 1);
    if (k === 'delete' || k === 'backspace') { e.preventDefault(); borrar(); }
    else if (ctrl && k === 'z') { e.preventDefault(); e.shiftKey ? (E.hi < E.hist.length - 1 && restaurar(E.hi + 1)) : (E.hi > 0 && restaurar(E.hi - 1)); }
    else if (ctrl && k === 'y') { e.preventDefault(); E.hi < E.hist.length - 1 && restaurar(E.hi + 1); }
    else if (ctrl && k === 'd') { e.preventDefault(); duplicar(); }
    else if (ctrl && k === 'a') { e.preventDefault(); E.sel = new Set(items().map((i) => i._id)); drawAll(); }
    else if (k === 'r' && !ctrl) rotar90();
    else if (k === 'v') { E.tool = 'sel'; drawBar(); }
    else if (k === 'escape') { E.tool = 'sel'; E.sel = new Set(); drawAll(); }
    else if (k.startsWith('arrow') && sel().length) { e.preventDefault(); const dx = k === 'arrowleft' ? -paso : k === 'arrowright' ? paso : 0, dy = k === 'arrowup' ? -paso : k === 'arrowdown' ? paso : 0;
      sel().forEach((i) => { i.x += dx; i.y += dy; clamp(i); }); commit(); drawAll(); }
  };
  const ku = (e) => { if (e.code === 'Space') { E.espacio = false; cv.style.cursor = E.tool === 'mano' ? 'grab' : ''; } };
  document.addEventListener('keydown', kb); document.addEventListener('keyup', ku);
  S.cleanup = () => { document.removeEventListener('keydown', kb); document.removeEventListener('keyup', ku); S.sucio = false; };
  commit(); S.sucio = false; drawAll();
};

// 6 · Edición: guardias (con cuenta de acceso), tarifas, residentes, documentos y solicitudes
VIEWS.edicion = async () => {
  const [gs, cfg, rec, sol, res] = await Promise.all([api('/guardias'), api('/config'), api('/recibos'), api('/solicitudes'), api('/residentes')]);
  const t = cfg.tarifas;
  $('#view').innerHTML = `<h2>Edición</h2><p class="muted">Guardias, tarifas, residentes y documentos</p><div class="cols" style="gap:0 22px;align-items:start"><div>
    <div class="card"><div class="row"><b>Guardias de seguridad</b><button class="btn teal sm spacer" id="nuevo">${ic('plus')} Registrar guardia</button></div>
      <div class="scroll"><table class="tbl" style="margin-top:10px"><tr><th>Nombre</th><th>Correo de acceso</th><th>Turno</th><th></th></tr>${gs.map((g) => `<tr><td>${esc(g.nombre)}</td><td>${esc(g.correo)}</td><td>${esc(g.turno)}</td>
      <td class="acts"><button class="icon" data-ed="${g.id}" title="Editar">${ic('edit')}</button><button class="icon danger" data-del="${g.id}" title="Eliminar">${ic('trash')}</button></td></tr>`).join('')}</table></div>
      <p class="muted" style="margin:10px 0 0">Al registrar un guardia se crea su cuenta; al eliminarlo se revoca su acceso.</p></div>
    <div class="card"><b>Tarifas por tiempo</b><label class="l">Visitante · primera hora</label><input class="f" id="t1" type="number" value="${t.primeraHora}">
      <label class="l">Hora adicional</label><input class="f" id="t2" type="number" value="${t.horaAdicional}"><label class="l">Fracción (15 min)</label><input class="f" id="t3" type="number" value="${t.fraccion}">
      <button class="btn teal block" id="tar">Guardar tarifas</button></div></div>
    <div><div class="card"><b>Residentes registrados</b><p class="muted">${res.length} cuenta(s) activas</p><div class="scroll"><table class="tbl"><tr><th>Residente</th><th>Torre · Apto</th><th>Placa</th></tr>
      ${res.map((r) => `<tr><td>${esc(r.nombre)}<br><small class="mu">${esc(r.correo)}</small></td><td>${esc(r.torre)} · ${esc(r.apartamento)}</td><td>${esc((r.placas || []).join(', '))}</td></tr>`).join('') || '<tr><td colspan="3">Aún no hay residentes</td></tr>'}</table></div></div>
    <div class="card"><b>Documentos de residentes</b><p class="muted">Recibos enviados para rectificación</p><div class="scroll"><table class="tbl"><tr><th>Residente</th><th>Documento</th><th>Estado</th><th></th></tr>
      ${rec.map((r) => `<tr><td>${esc(ab(r.residente))}</td><td>${esc(r.nombre)}</td><td><button class="icon" data-rev="${r.id}" title="Cambiar estado">${badge(r.estado)}</button></td><td><button class="icon" data-dl="${r.id}" title="Descargar">${ic('down')}</button></td></tr>`).join('') || '<tr><td colspan="4">Sin documentos</td></tr>'}</table></div></div>
    <div class="card"><b>Solicitudes de celdas</b><p class="muted">Compra o arriendo mensual</p><div class="scroll"><table class="tbl"><tr><th>Residente</th><th>Placa</th><th>Celda</th><th>Estado</th></tr>
      ${sol.map((s) => `<tr><td>${esc(ab(s.residente))}</td><td>${esc(s.placa)}</td><td>${esc(s.celda)}</td><td>${s.estado === 'Pendiente' ? `<button class="btn teal sm" data-ap="${s.id}">Aprobar</button> <button class="btn line sm" data-re="${s.id}">Rechazar</button>` : badge(s.estado)}</td></tr>`).join('') || '<tr><td colspan="4">Sin solicitudes</td></tr>'}</table></div></div></div></div>`;
  $('#nuevo').onclick = run(async () => {
    const v = await pedir('Registrar guardia', [{ name: 'nombre', placeholder: 'Nombre completo' }, { name: 'correo', type: 'email', placeholder: 'Correo (será su usuario)' },
      { name: 'telefono', type: 'tel', placeholder: 'Teléfono' }, { name: 'turno', placeholder: 'Turno: 08:00–16:00' }, { name: 'password', type: 'password', placeholder: 'Contraseña inicial (mín. 6)' }], 'Registrar');
    if (v) { await api('/guardias', 'POST', v); toast('Guardia registrado. Ya puede iniciar sesión.', 'success'); VIEWS.edicion(); }
  });
  $$('[data-ed]').forEach((b) => (b.onclick = run(async () => { const g = gs.find((x) => x.id == b.dataset.ed);
    const v = await pedir('Editar guardia', [{ name: 'nombre', value: g.nombre }, { name: 'telefono', type: 'tel', value: g.telefono, placeholder: 'Teléfono' }, { name: 'turno', value: g.turno },
      { name: 'password', type: 'password', placeholder: 'Nueva contraseña (opcional)' }]); if (v) { await api('/guardias/' + g.id, 'PUT', v); VIEWS.edicion(); } })));
  $$('[data-del]').forEach((b) => (b.onclick = run(async () => { if (await confirmar('¿Eliminar este guardia? Se revocará su acceso al sistema.')) { await api('/guardias/' + b.dataset.del, 'DELETE'); VIEWS.edicion(); } })));
  $('#tar').onclick = run(async () => { await api('/tarifas', 'PUT', { primeraHora: $('#t1').value, horaAdicional: $('#t2').value, fraccion: $('#t3').value }); toast('Tarifas guardadas', 'success'); });
  $$('[data-rev]').forEach((b) => (b.onclick = run(async () => { await api('/recibos/' + b.dataset.rev, 'PUT'); VIEWS.edicion(); })));
  $$('[data-dl]').forEach((b) => (b.onclick = run(async () => { const f = await api(`/recibos/${b.dataset.dl}/archivo`); const l = document.createElement('a'); l.href = f.archivo; l.download = f.nombre; l.click(); })));
  $$('[data-ap]').forEach((b) => (b.onclick = run(async () => { await api('/solicitudes/' + b.dataset.ap, 'PUT', { accion: 'aprobar' }); toast('Celda asignada como mensual', 'success'); VIEWS.edicion(); })));
  $$('[data-re]').forEach((b) => (b.onclick = run(async () => { await api('/solicitudes/' + b.dataset.re, 'PUT', { accion: 'rechazar' }); VIEWS.edicion(); })));
};

// 7 · Guardia · parqueadero en vivo
VIEWS.mapa = async () => {
  const [d, m] = await Promise.all([api('/dashboard?zona=' + enc(S.zona)), api('/mapa?zona=' + enc(S.zona))]);
  $('#view').innerHTML = `<h2>Parqueadero en vivo</h2><p class="muted">${zonaSelect()} · ${d.libres} libres / ${d.ocupados} ocupados</p>${selVista()}${mapaBloque(m)}${legend}
    <button class="btn teal block" id="ir_in">${ic('plus')} Registrar ingreso</button><button class="btn navy block" id="ir_out">${ic('down')} Registrar salida y cobrar</button>`;
  $('#ir_in').onclick = () => go('ingreso'); $('#ir_out').onclick = () => go('salida'); bindZona(); bindVista();
};

// 7b · Guardia · registrar ingreso (espacio sugerido resaltado en el plano)
VIEWS.ingreso = async () => {
  const m = await api('/mapa?zona=' + enc(S.zona)); let tipo = 'carro', fotos = 0;
  $('#view').innerHTML = `<div class="pagehead" id="back">${ic('left')} Registrar ingreso</div><div class="card">
    <label class="l" style="margin-top:0">Placa</label><input class="f" id="placa" placeholder="KLM-45D" maxlength="8" style="text-transform:uppercase">
    <label class="l">Tipo de vehículo</label><div class="seg2"><button data-t="carro" class="on">Carro</button><button data-t="moto">Moto</button></div>
    <label class="l">Clase</label><select class="f" id="clase"><option value="visitante">Visitante</option><option value="residente">Residente</option></select>
    <label class="l">Espacio asignado (sugerido) · ${esc(S.zona)}</label><select class="f green" id="celda"></select>
    <p class="muted" id="nota" style="margin:8px 0 0"></p><div id="mini" class="planoWrap" style="margin-top:12px"></div></div>
    <div class="card"><b>Daños previos al ingreso</b><label class="dashed" for="fotos" style="margin-top:10px">${ic('camera')} Tomar / adjuntar fotos<small id="finfo">Sin fotos</small></label>
    <input type="file" id="fotos" accept="image/*" multiple hidden><textarea class="f" id="danos" rows="2" placeholder="Describe los daños (ej. Rayón puerta izq.)" style="margin-top:10px"></textarea></div>
    <button class="btn teal block" id="ok">Confirmar ingreso</button>`;
  const pintar = () => { $('#mini').innerHTML = mapaSvg(m, { resaltar: [Number($('#celda').value)] }); };
  const cargar = run(async () => {
    const sug = await api(`/celdas/sugeridas?zona=${enc(S.zona)}&tipo=${tipo}`);
    $('#celda').innerHTML = sug.map((c, i) => `<option value="${c.idCelda}">${esc(c.numero)} · ${i === 0 ? 'cercano a entrada' : c.distancia + ' m de la entrada'}${c.tipo === 'discapacidad' ? ' · accesible' : ''}</option>`).join('') || '<option value="">Sin celdas libres</option>';
    pintar();
  });
  $('#back').onclick = () => go('mapa'); $('#celda').onchange = pintar;
  $$('.seg2 button').forEach((b) => (b.onclick = () => { tipo = b.dataset.t; $$('.seg2 button').forEach((x) => x.classList.toggle('on', x === b)); cargar(); }));
  $('#fotos').onchange = (e) => { fotos = e.target.files.length; $('#finfo').textContent = fotos ? fotos + ' foto(s) adjuntas' : 'Sin fotos'; };
  $('#placa').onchange = run(async () => {
    const p = $('#placa').value.trim(); if (!p) return; const r = await api('/placa/' + enc(p));
    $('#celda').disabled = !!r.mensual; if (r.mensual) { $('#clase').value = 'residente'; $('#nota').textContent = `Mensualidad activa: celda ${r.mensual.celda} (${r.mensual.propietario})`; }
    else $('#nota').textContent = r.dentro ? '⚠ Este vehículo ya figura dentro del parqueadero' : '';
  });
  $('#ok').onclick = run(async () => {
    await api('/accesos/entrada', 'POST', { placa: $('#placa').value, tipo, clase: $('#clase').value, celdaId: $('#celda').value, danos: { descripcion: $('#danos').value, fotos } });
    toast('Ingreso registrado', 'success'); go('mapa');
  });
  cargar();
};

// 8 · Guardia · registro de salida con cobro automático
VIEWS.salida = async () => {
  const act = await api('/accesos/activos');
  $('#view').innerHTML = `<div class="pagehead" id="back">${ic('left')} Registrar salida</div><div class="card"><label class="l" style="margin-top:0">Placa</label>
    <input class="f" id="placa" list="dl" placeholder="Busca o escribe la placa" style="text-transform:uppercase"><datalist id="dl">${act.map((a) => `<option value="${esc(a.placa)}">`).join('')}</datalist>
    <button class="btn navy block" id="buscar">Buscar vehículo</button></div><div id="res"></div>`;
  $('#back').onclick = () => go('mapa');
  const buscar = run(async () => {
    const r = await api('/salida/preview?placa=' + enc($('#placa').value)), a = r.acceso;
    $('#res').innerHTML = `<div class="card"><div class="line2"><span>Placa</span><b>${esc(a.placa)}</b></div><div class="line2"><span>Ingreso</span><b>${hm(a.entrada)}</b></div>
      <div class="line2"><span>Salida</span><b>${hm(r.ahora)}</b></div><div class="line2"><span>Permanencia</span><b>${dur(r.min)}</b></div>
      <div class="line2" style="border:0"><span>Espacio</span><b>${esc(a.celda)} (${a.clase === 'residente' ? 'Residente' : 'Visitante'})</b></div></div>
      <div class="total"><small>TOTAL A COBRAR</small><b>${money(r.total)}</b><small>${a.clase === 'residente' || a.mensualidad ? 'Mensualidad: sin cobro' : `1ª hora ${money(r.primera)}${r.adicional ? ' + adicional ' + money(r.adicional) : ''}`}</small></div>
      <button class="btn teal block" id="conf">Confirmar cobro y salida</button>`;
    $('#conf').onclick = run(async () => { await api('/salida', 'PUT', { placa: a.placa }); toast(`Salida registrada · Cobro ${money(r.total)}`, 'success'); go('mapa'); });
  });
  $('#buscar').onclick = buscar; $('#placa').onchange = buscar;
};

// 9 · Residente · inicio (estado de cuenta + historial)
VIEWS.inicio = async () => {
  const [c, h] = await Promise.all([api('/estado-cuenta'), api('/accesos/mios')]);
  $('#view').innerHTML = `<div class="card"><small class="muted">Estado de cuenta</small><div class="big ${c.saldo ? 'red' : 'green'}">${money(c.saldo)}</div>
    <div class="muted" style="margin:0">${esc(c.estado)}${c.detalle ? ' · ' + esc(c.detalle) : ''}</div></div>
    <h4>Historial de mi vehículo</h4><table class="tbl"><tr><th>Fecha</th><th>Entrada</th><th>Salida</th></tr>
    ${h.slice(0, 12).map((a) => `<tr><td>${dm(a.entrada)}</td><td>${hm(a.entrada)}</td><td>${a.salida ? hm(a.salida) : 'En parqueo'}</td></tr>`).join('') || '<tr><td colspan="3">Sin movimientos</td></tr>'}</table>`;
};

// 9b · Residente · enviar recibo
VIEWS.recibos = async () => {
  const rec = await api('/recibos'); let file = null;
  $('#view').innerHTML = `<div class="pagehead">Enviar recibo</div><div class="card"><label class="l" style="margin-top:0">Concepto</label><input class="f" id="concepto" value="Pago mensualidad septiembre">
    <label class="l">Valor consignado</label><input class="f" id="valor" type="number" value="120000"><label class="l">Comprobante</label>
    <label class="dashed" for="arch">${ic('clip')} Adjuntar recibo / foto<small id="ainfo">Ningún archivo</small></label><input type="file" id="arch" accept="image/*,.pdf" hidden>
    <button class="btn teal block" id="enviar">Enviar a administración</button></div>
    <h4>Envíos recientes</h4><div class="card">${rec.map((r) => `<div class="line2"><span>${esc(r.nombre)}</span>${badge(r.estado)}</div>`).join('') || 'Aún no has enviado recibos'}</div>`;
  $('#arch').onchange = run(async (e) => { const f = e.target.files[0]; if (!f) return; file = { nombre: f.name, archivo: await leerArchivo(f) }; $('#ainfo').textContent = f.name; });
  $('#enviar').onclick = run(async () => { await api('/recibos', 'POST', { concepto: $('#concepto').value, valor: $('#valor').value, ...(file || {}) }); toast('Recibo enviado', 'success'); VIEWS.recibos(); });
};

// 9c · Residente · solicitar cupo (con plano y celdas sugeridas resaltadas)
VIEWS.cupo = async () => {
  const sol = await api('/solicitudes'); let celdaId = null, mapa = null;
  const opts = S.config.zonas.flatMap((z) => S.config.torres.map((t) => `<option value="${esc(z)}|${t.idTorre}">${esc(z)} · cerca a ${esc(t.nombre)}</option>`)).join('');
  $('#view').innerHTML = `<div class="pagehead">Solicitar cupo</div><div class="card"><label class="l" style="margin-top:0">Placa del vehículo</label>
    <select class="f" id="placa">${(S.user.placas || []).map((p) => `<option>${esc(p)}</option>`).join('')}</select>
    <label class="l">Tipo de solicitud</label><select class="f" id="tipo"><option>Arrendamiento de celda mensual</option><option>Compra de celda</option></select>
    <label class="l">Zona preferida</label><select class="f" id="zp">${opts}</select>
    <label class="l">Celdas libres sugeridas (por proximidad)</label><div class="chips" id="chips"></div><div id="mapaC" class="planoWrap" style="margin-top:12px"></div>
    <button class="btn teal block" id="enviar">Enviar solicitud</button></div>
    <h4>Mis solicitudes</h4><div class="card">${sol.map((s) => `<div class="line2"><span>${esc(s.celda)} · ${esc(s.tipo)}</span>${badge(s.estado)}</div>`).join('') || 'Sin solicitudes'}</div>`;
  const pintar = () => { if (mapa) $('#mapaC').innerHTML = mapaSvg(mapa, { resaltar: [Number(celdaId)] }); };
  const cargar = run(async () => {
    const [z, t] = $('#zp').value.split('|');
    const [l, m] = await Promise.all([api(`/celdas/sugeridas?zona=${enc(z)}&torre=${t}`), api('/mapa?zona=' + enc(z))]); mapa = m;
    const top = l.slice(0, 4); celdaId = top[0]?.idCelda || null;
    $('#chips').innerHTML = top.map((c, i) => `<button class="chip ${i ? '' : 'on'}" data-id="${c.idCelda}">${esc(c.numero)} · ${c.distancia} m</button>`).join('') || 'Sin celdas libres en esta zona';
    $$('.chip').forEach((b) => (b.onclick = () => { celdaId = b.dataset.id; $$('.chip').forEach((x) => x.classList.toggle('on', x === b)); pintar(); }));
    pintar();
  });
  $('#zp').onchange = cargar; cargar();
  $('#enviar').onclick = run(async () => { const r = await api('/solicitudes', 'POST', { placa: $('#placa').value, tipo: $('#tipo').value, celdaId }); toast(`Solicitud enviada · celda ${r.celda} reservada`, 'success'); VIEWS.cupo(); });
};

// ------------------------------------------------------------------ tiempo real y arranque
const live = () => { if (S.token && ['tiempo', 'mapa'].includes(S.view)) VIEWS[S.view]().catch(() => {}); };
try { const sock = io(); sock.on('celda:actualizada', live); sock.on('datos:actualizados', live); } catch (e) { console.warn('Sin tiempo real', e); }
boot();
