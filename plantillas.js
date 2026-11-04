'use strict';
// Plantillas de mapa 2D (inspiradas en planos reales de parqueaderos).
// Unidades: píxeles del lienzo (≈ 0,05 m por píxel). rot = hacia dónde mira el vehículo: 0 arriba, 90 derecha, 180 abajo, 270 izquierda.
const SW = 60, SH = 90;
const fila = (p, d, n, x, y, paso, rot = 0, tipo = 'carro') => Array.from({ length: n }, (_, i) => ({ numero: p + (d + i), x: x + i * paso, y, w: SW, h: SH, rot, tipo }));
const columna = (p, d, n, x, y, paso, rot = 90, tipo = 'carro') => Array.from({ length: n }, (_, i) => ({ numero: p + (d + i), x, y: y + i * paso, w: SH, h: 52, rot, tipo }));
const motos = (p, d, n, x, y) => Array.from({ length: n }, (_, i) => ({ numero: p + (d + i), x: x + i * 40, y, w: 36, h: 60, rot: 0, tipo: 'moto' }));
const muros = (W, H, [g0, g1]) => [
  { tipo: 'muro', x: 0, y: 0, w: W, h: 8 }, { tipo: 'muro', x: 0, y: 0, w: 8, h: H }, { tipo: 'muro', x: W - 8, y: 0, w: 8, h: H },
  { tipo: 'muro', x: 0, y: H - 8, w: g0, h: 8 }, { tipo: 'muro', x: g1, y: H - 8, w: W - g1, h: 8 }];
const accesible = (cs, n) => { const c = cs.find((k) => k.numero === n); if (c) c.tipo = 'discapacidad'; return cs; };

const PLANTILLAS = {
  vacio: () => ({ ancho: 800, alto: 560, celdas: [], elementos: [...muros(800, 560, [340, 460]),
    { tipo: 'entrada', x: 340, y: 520, w: 120, h: 20, texto: 'ENTRADA / SALIDA' }, { tipo: 'torre', x: 20, y: 14, w: 70, h: 40, ref: 1 }, { tipo: 'torre', x: 710, y: 14, w: 70, h: 40, ref: 2 }] }),

  // Bloque central de doble fila + filas laterales (estilo plano 1)
  central: () => {
    const c = accesible([...fila('A', 1, 7, 150, 30, 66, 0), ...fila('B', 1, 7, 150, 215, 66, 0), ...fila('C', 1, 7, 150, 307, 66, 180),
      ...columna('D', 1, 4, 20, 60, 56, 90), ...columna('E', 1, 4, 790, 60, 56, 270), ...motos('M', 1, 3, 660, 30)], 'D1');
    return { ancho: 900, alto: 600, celdas: c, elementos: [...muros(900, 600, [380, 520]),
      { tipo: 'isla', x: 114, y: 205, w: 30, h: 200 }, { tipo: 'isla', x: 612, y: 205, w: 30, h: 200 },
      { tipo: 'planta', x: 24, y: 520, w: 56, h: 56 }, { tipo: 'planta', x: 820, y: 520, w: 56, h: 56 },
      { tipo: 'flecha', x: 380, y: 140, w: 60, h: 40, rot: 90 }, { tipo: 'flecha', x: 700, y: 300, w: 40, h: 60, rot: 180 },
      { tipo: 'flecha', x: 360, y: 440, w: 60, h: 40, rot: 270 }, { tipo: 'flecha', x: 50, y: 340, w: 40, h: 60, rot: 0 },
      { tipo: 'stop', x: 400, y: 516, w: 100, h: 22 }, { tipo: 'cruce', x: 385, y: 545, w: 130, h: 30 },
      { tipo: 'entrada', x: 380, y: 576, w: 140, h: 20, texto: 'ENTRADA / SALIDA' },
      { tipo: 'torre', x: 20, y: 14, w: 70, h: 40, ref: 1 }, { tipo: 'torre', x: 810, y: 14, w: 70, h: 40, ref: 2 }] };
  },

  // Perimetral con isla central y entrada inferior (estilo plano 2)
  perimetral: () => {
    const c = accesible([...fila('A', 1, 7, 110, 30, 66, 0), ...fila('B', 1, 3, 60, 440, 66, 180), ...fila('B', 4, 4, 520, 440, 66, 180),
      ...columna('C', 1, 3, 20, 150, 56, 90), ...columna('D', 1, 3, 690, 150, 56, 270)], 'B4');
    return { ancho: 800, alto: 560, celdas: c, elementos: [...muros(800, 560, [300, 500]),
      { tipo: 'isla', x: 330, y: 200, w: 140, h: 80 }, { tipo: 'planta', x: 20, y: 470, w: 36, h: 36 },
      { tipo: 'flecha', x: 250, y: 160, w: 60, h: 40, rot: 90 }, { tipo: 'flecha', x: 560, y: 330, w: 60, h: 40, rot: 270 }, { tipo: 'flecha', x: 140, y: 300, w: 40, h: 60, rot: 0 },
      { tipo: 'stop', x: 350, y: 396, w: 100, h: 22 }, { tipo: 'cruce', x: 335, y: 425, w: 130, h: 30 },
      { tipo: 'entrada', x: 300, y: 530, w: 200, h: 20, texto: 'ENTRADA / SALIDA' },
      { tipo: 'torre', x: 20, y: 14, w: 70, h: 40, ref: 1 }, { tipo: 'torre', x: 710, y: 14, w: 70, h: 40, ref: 2 }] };
  },

  // Dos columnas laterales y carril central con barrera (estilo plano 3)
  lateral: () => {
    const c = accesible([...columna('L', 1, 8, 20, 30, 56, 90), ...columna('R', 1, 8, 590, 30, 56, 270)], 'L1');
    return { ancho: 700, alto: 640, celdas: c, elementos: [...muros(700, 640, [260, 440]),
      { tipo: 'isla', x: 470, y: 500, w: 130, h: 100 }, { tipo: 'texto', x: 480, y: 535, w: 110, h: 26, texto: 'Caseta' },
      { tipo: 'flecha', x: 330, y: 200, w: 40, h: 60, rot: 0 }, { tipo: 'flecha', x: 330, y: 380, w: 40, h: 60, rot: 0 },
      { tipo: 'stop', x: 300, y: 498, w: 100, h: 22 }, { tipo: 'cruce', x: 285, y: 526, w: 130, h: 30 },
      { tipo: 'entrada', x: 260, y: 604, w: 180, h: 22, texto: 'ENTRADA / SALIDA' },
      { tipo: 'torre', x: 20, y: 500, w: 70, h: 40, ref: 1 }, { tipo: 'torre', x: 610, y: 490, w: 70, h: 40, ref: 2 }] };
  },
};
const INFO = [
  { id: 'vacio', nombre: 'Mapa en blanco', descripcion: 'solo muros, entrada y accesos a torre' },
  { id: 'central', nombre: 'Bloque central', descripcion: 'doble fila central y filas laterales' },
  { id: 'perimetral', nombre: 'Perimetral', descripcion: 'celdas en el borde, isla central y entrada inferior' },
  { id: 'lateral', nombre: 'Lateral con barrera', descripcion: 'dos columnas y carril central' },
];
module.exports = { PLANTILLAS, INFO };
