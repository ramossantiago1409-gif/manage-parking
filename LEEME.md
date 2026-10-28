# Manage Parking · Prototipo 5 (editor de mapa 2D + base de datos)
1. npm install
2. npm start
3. Abrir http://localhost:3000

Cuentas de demostración (al elegir el perfil en el login se rellenan solas):
- Admin (precargado):               admin@torrecentral.com   / admin123
- Guardia (lo registra el admin):   guarda@torrecentral.com  / guarda123
- Residente (se autorregistra):     camilo@torrecentral.com  / resi123

Novedad v4: Administrador → "Mapa 2D" permite crear zonas desde plantillas y editar el plano
(celdas, islas, flechas, entradas, stop, cruces, plantas, muros, accesos a torre, texto).

Publicar en internet: ver DESPLIEGUE.md (Render, Hostinger o VPS). Variables: MODO_DEMO, ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET.

Base de datos: define DATABASE_URL (PostgreSQL, MySQL o SQLite). Ver DESPLIEGUE.md sección 4. Vaciar: npm run db:reset -- --si
