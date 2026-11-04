# Publicar Manage Parking en internet

## 1. ¿Por qué no 000webhost?
000webhost (hoy parte de Hostinger) está pensado para sitios **PHP + MySQL**. Manage Parking es una
aplicación **Node.js** que mantiene un proceso encendido y usa **WebSockets** (Socket.IO) para el mapa en vivo,
así que necesita un hosting que ejecute Node.js. Opciones:

| Opción | Costo | Ventajas | Cosas a tener en cuenta |
|---|---|---|---|
| **Render** (plan Free) | Gratis | Conecta con GitHub, HTTPS automático, admite WebSockets | Se **duerme tras 15 min sin tráfico** (el primer acceso tarda hasta ~1 min); el disco es temporal; 750 h/mes |
| **Hostinger "Web Apps"** (Node.js administrado) | De pago | Siempre encendido, subes ZIP o Git, tiene MySQL | Confirma con soporte que permite WebSockets antes de comprar; los precios promocionales exigen plan largo |
| **VPS** (Hostinger, DigitalOcean, Contabo…) | De pago | Control total, siempre encendido | Tú instalas Node, Nginx y HTTPS (pasos en la sección 6) |

Para la sustentación o una demostración, **Render gratis** es lo más rápido. Para uso real con residentes,
usa un plan de pago siempre encendido y migra a MySQL (los datos hoy viven en memoria).

## 2. Variables de entorno
| Variable | Qué hace |
|---|---|
| `MODO_DEMO` | `1` = datos y cuentas de demostración, con **acceso rápido** en el login (para mostrar). `0` = instalación real, vacía y sin cuentas de prueba. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Cuenta del administrador. **Con `MODO_DEMO=0` son obligatorias.** |
| `ADMIN_NOMBRE`, `CONJUNTO` | Nombre del administrador y del conjunto. |
| `JWT_SECRET` | Cadena larga y aleatoria que firma las sesiones. Sin ella se usa una temporal. |
| `DATABASE_URL` | Dirección de la base de datos (`postgres://…`, `mysql://…` o `sqlite:ruta.db`). Sin ella los datos viven solo en memoria. |
| `DB_SSL` | `1` fuerza conexión cifrada, `0` la desactiva. Por defecto se activa sola con Neon, Render, Supabase, Aiven y TiDB. |
| `ADMIN_RESET` | `1` restablece el correo y la clave del administrador desde `ADMIN_EMAIL`/`ADMIN_PASSWORD` (recuperación). Quítala después. |
| `PORT` | La pone el hosting automáticamente. |

> En modo demostración, **cualquiera que abra la URL puede entrar como administrador (demo)** con un toque, y verá y podrá
> modificar los datos de prueba. Es lo que se necesita para presentar desde cualquier dispositivo, pero **no lo dejes activo con datos reales**.
> Tu administrador real (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) es otra cuenta y su clave nunca se muestra.
> Al pasar a `MODO_DEMO=0` el sistema elimina solo las cuentas de demostración que hubieran quedado en la base de datos.

## 3. Render paso a paso
**A. Subir el código a GitHub**
1. Crea una cuenta en github.com y un repositorio nuevo, por ejemplo `manage-parking` (privado está bien).
2. En VS Code abre la carpeta del proyecto y ejecuta en la terminal:
   ```
   git init
   git add .
   git commit -m "Manage Parking v4"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/manage-parking.git
   git push -u origin main
   ```
   (`.gitignore` ya excluye `node_modules` y `.env`.)

**B. Crear el servicio en Render**
1. Entra a render.com → *Sign in with GitHub*.
2. **New + → Web Service** → elige tu repositorio.
3. Configura: *Runtime* **Node** · *Build Command* `npm install` · *Start Command* `npm start` · *Instance Type* **Free**.
   Elige la región más cercana a Colombia (Estados Unidos Este, si aparece).
4. En **Environment** agrega las variables de la sección 2 (`MODO_DEMO`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`, `NODE_VERSION=20`).
5. En **Health Check Path** escribe `/healthz`.
6. **Create Web Service**. Cuando termine, tu sistema queda en `https://manage-parking-xxxx.onrender.com`.
   (Alternativa rápida: *New + → Blueprint* usa el archivo `render.yaml` incluido.)

**C. Probar**
- Abre la URL, inicia sesión y abre la app en **otro dispositivo**: al registrar una entrada, el mapa debe cambiar en ambos sin recargar.
- Cada `git push` a `main` vuelve a desplegar automáticamente.

**D. Limitaciones del plan gratis**
- Tras 15 min sin tráfico se duerme. Sin `DATABASE_URL` **los datos vuelven al estado inicial**; con base de datos se conservan.
  Abre la URL unos minutos antes de presentar.
- Un monitor externo (UptimeRobot, etc.) que consulte `/healthz` cada 10 minutos lo mantiene despierto;
  las 750 horas gratuitas alcanzan para un servicio encendido todo el mes. Revisa las condiciones vigentes de Render.

## 4. Base de datos (para que los datos no se pierdan)
Con `DATABASE_URL` el sistema crea **10 tablas** (`usuarios`, `guardias`, `torres`, `zonas`, `celdas`, `accesos`, `recibos`,
`solicitudes`, `cuentas`, `config`), carga lo guardado al arrancar y escribe cada cambio en pocos segundos.
Funciona con **PostgreSQL**, **MySQL/MariaDB** y **SQLite** (solo local, Node 22.13 o superior).

| Servicio | Motor | Gratis | Nota |
|---|---|---|---|
| **Neon** (recomendado) | PostgreSQL | Sí, permanente: 0,5 GB y 100 h de cómputo al mes | Se suspende tras 5 min sin uso y despierta en segundos; no hace esperar a los usuarios porque las escrituras son en segundo plano |
| Render Postgres | PostgreSQL | La instancia gratis **caduca a los 30 días** | Sirve para una prueba corta |
| Hostinger / TiDB Cloud / Aiven | MySQL | Según plan | Usa una URL `mysql://usuario:clave@host:puerto/base` |

**Conectar Neon a lo que ya tienes (no hay que volver a crear el servicio en Render):**
1. En neon.com crea una cuenta y un proyecto (`manage-parking`; región AWS US East si aparece).
2. Copia la **connection string** (Connection details → *Pooled connection*), que empieza por `postgresql://`.
3. En Render → tu servicio → **Environment** → *Add Environment Variable* → `DATABASE_URL` = esa cadena → *Save*. Render vuelve a desplegar.
4. En **Logs** debe aparecer `Base de datos postgres: tablas creadas con los datos iniciales`. En los siguientes arranques:
   `datos cargados (N filas)`. En el panel del administrador verás la insignia verde **BD PostgreSQL**.

**Prueba local con SQLite (opcional):** en la carpeta del proyecto crea un archivo `.env` con `DATABASE_URL=sqlite:./datos.db` y ejecuta `npm start`.

**Importante**
- La primera vez se guarda el estado inicial (con `MODO_DEMO=1`, incluye los datos de demostración). Si luego quieres pasar a `MODO_DEMO=0`,
  vacía la base con `npm run db:reset -- --si` (con `DATABASE_URL` definida) y reinicia.
- Cambiar `ADMIN_PASSWORD` en Render **no** cambia la clave ya guardada; usa `ADMIN_RESET=1` una vez (y luego quítala).
- Si `DATABASE_URL` está mal, el servidor se detiene y lo dice en los Logs (así no se pierden datos sin avisar). Para volver a memoria, borra la variable.
- Haz copias de seguridad desde el panel de tu proveedor (Neon permite restaurar a un punto anterior en planes de pago).

## 5. Antes de usarlo con datos reales
1. `MODO_DEMO=0`, `ADMIN_PASSWORD` robusta y `JWT_SECRET` propio.
2. Conectar la base de datos (sección 4): sin ella los datos se pierden al reiniciar.
3. Pedir a cada residente la autorización de datos (Ley 1581 de 2012): ya está en el registro.
4. Copias de seguridad de la base de datos y un dominio propio con HTTPS.

## 6. VPS (Ubuntu) resumido
```
sudo apt update && sudo apt install -y nginx git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
git clone https://github.com/TU_USUARIO/manage-parking.git && cd manage-parking && npm install --omit=dev
sudo npm i -g pm2
MODO_DEMO=0 ADMIN_EMAIL=... ADMIN_PASSWORD=... JWT_SECRET=... PORT=3000 pm2 start server.js --name manage-parking
pm2 save && pm2 startup
```
Nginx (`/etc/nginx/sites-available/manage-parking`), con soporte WebSocket:
```
server {
  server_name tudominio.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```
Luego `sudo ln -s /etc/nginx/sites-available/manage-parking /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx`
y HTTPS gratis con `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d tudominio.com`.

## 7. Entrar como administrador desde otro dispositivo
1. **Abre la dirección pública** de tu servicio en el navegador del otro dispositivo (celular, tableta u otro computador):
   `https://manage-parking-xxxx.onrender.com` (la ves en el panel de Render, arriba a la izquierda del servicio).
   Si estaba dormido, el primer acceso puede tardar hasta ~1 minuto.
2. En el login elige **Admin** y entra de una de estas formas:
   - **Modo demostración (`MODO_DEMO=1`)**: toca **Acceso rápido → Administrador**. No necesitas escribir nada.
   - **Cuenta real**: el correo y la clave que pusiste en `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
3. Puedes tener **varios dispositivos conectados a la vez** (cada uno con su sesión de 8 horas). Si inicias sesión como guardia en uno y como
   administrador en otro, el mapa se actualiza en ambos en tiempo real.
4. **Solo en tu red (sin internet)**: ejecuta `npm start`, averigua la IP de tu computador (`ipconfig` en Windows) y abre `http://TU_IP:3000`
   desde otro dispositivo conectado al mismo Wi‑Fi (permite el acceso en el firewall si Windows lo pregunta).
5. **Olvidaste la clave del administrador real**: en Render agrega `ADMIN_RESET=1` junto con la nueva `ADMIN_PASSWORD`, guarda, y cuando el servicio
   reinicie entra con ella; después quita `ADMIN_RESET`.
6. En el celular puedes usar *Compartir → Añadir a pantalla de inicio* para abrirlo como una app.
