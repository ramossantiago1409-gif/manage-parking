'use strict';
// Carga opcional de un archivo .env (solo para desarrollo local). No pisa variables ya definidas.
const fs = require('fs'), path = require('path');
const f = path.join(__dirname, '.env');
if (fs.existsSync(f)) {
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !l.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2');
  }
}
