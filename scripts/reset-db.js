'use strict';
// Borra TODAS las tablas de Manage Parking en la base de datos de DATABASE_URL.
// Uso:  npm run db:reset -- --si        (en PowerShell/cmd/bash; define antes DATABASE_URL o ponla en .env)
require('../entorno');
const { conectar } = require('../persistencia');
(async () => {
  if (!process.env.DATABASE_URL) { console.error('Define DATABASE_URL (variable de entorno o archivo .env).'); process.exit(1); }
  if (!process.argv.includes('--si')) { console.log('Esto BORRA todos los datos de Manage Parking. Ejecuta de nuevo con:  npm run db:reset -- --si'); process.exit(0); }
  const bd = await conectar(process.env.DATABASE_URL); await bd.borrarTodo(); await bd.cerrar();
  console.log('Tablas eliminadas. Al iniciar el servidor se crearán de nuevo con los datos iniciales.');
})().catch((e) => { console.error(e.message); process.exit(1); });
