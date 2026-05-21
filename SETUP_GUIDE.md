# 🍽️ COMEDOR UNCP PRO - Guía Completa de Implementación

## 📋 Índice

1. [Arquitectura del Sistema](#arquitectura)
2. [Instalación Local](#instalación-local)
3. [Despliegue en Servidor](#despliegue)
4. [Crear APK Nativa](#apk)
5. [Guía de Uso](#guía-de-uso)
6. [Modelo de Negocio](#modelo-de-negocio)

---

## Arquitectura del Sistema {#arquitectura}

```
┌─────────────────────────────────────────┐
│           Clientes (App/Web)            │
│   - Login por Device ID único           │
│   - Interface minimalista                │
│   - Registro automático                  │
│   - Captura de tickets                   │
└────────────┬────────────────────────────┘
             │
         REST API
             │
┌────────────▼────────────────────────────┐
│        Backend API (Node.js)            │
│   - Gestión de dispositivos             │
│   - Control de tickets/tokens           │
│   - Registro de operaciones             │
│   - Almacenamiento de datos             │
└────────────┬────────────────────────────┘
             │
    PostgreSQL/MongoDB
             │
         Local/Cloud
             │
    ┌────────▼──────────┐
    │   Admin Dashboard  │
    │   - Ver devices    │
    │   - Agregar tks    │
    │   - Estadísticas   │
    │   - Configuración  │
    └───────────────────┘
```

---

## Instalación Local {#instalación-local}

### Requisitos Previos

- Node.js 16+ (`https://nodejs.org`)
- npm o yarn
- Git
- (Opcional) PostgreSQL para producción

### Paso 1: Configurar Backend

```bash
# Crear directorio del proyecto
mkdir comedor-uncp
cd comedor-uncp

# Inicializar Node.js
npm init -y

# Instalar dependencias
npm install express cors uuid dotenv

# Crear archivo .env
cat > .env << 'EOF'
PORT=3000
ADMIN_TOKEN=tu-token-admin-super-secreto
NODE_ENV=development
EOF

# Copiar backend-api.js al proyecto
cp backend-api.js server.js

# Iniciar servidor
node server.js
```

Output esperado:
```
🚀 COMEDOR UNCP API running on port 3000
📍 Base URL: http://localhost:3000
🔐 Admin Token: tu-token-admin-super-secreto
⏰ Target time: 7:00
```

### Paso 2: Configurar Frontend (React)

```bash
# En otra terminal, crear proyecto React
npx create-react-app comedor-client
cd comedor-client

# Instalar html2canvas para captura de tickets
npm install html2canvas

# Copiar client-app.jsx a src/
cp client-app.jsx src/App.jsx

# CAMBIAR la URL base en App.jsx:
# const API_BASE = "http://localhost:3000/api"

npm start
```

La app será accesible en `http://localhost:3000` (React dev server)

### Paso 3: Configurar Admin Dashboard

```bash
# En otra terminal, crear proyecto React
npx create-react-app comedor-admin
cd comedor-admin

# Copiar admin-dashboard.jsx a src/
cp admin-dashboard.jsx src/App.jsx

# CAMBIAR las credenciales en App.jsx:
# const ADMIN_TOKEN = "tu-token-admin-super-secreto"
# const API_BASE = "http://localhost:3000"

npm start
```

El dashboard será accesible en `http://localhost:3000` (diferente puerto)

---

## Despliegue en Servidor {#despliegue}

### Opción 1: Servidor Cloud (Recomendado)

#### Usando Heroku

```bash
# Instalar Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Crear app
heroku create comedor-uncp-api

# Configurar variables de entorno
heroku config:set ADMIN_TOKEN="tu-token-super-secreto"
heroku config:set NODE_ENV=production

# Deployar
git push heroku main

# Ver logs
heroku logs --tail
```

#### Usando Railway

```bash
# Conectar repositorio GitHub
# Railway automáticamente detecta Node.js
# y ejecuta: npm install && npm start
```

#### Usando Render

```bash
# 1. Conectar repositorio GitHub
# 2. Crear Web Service
# 3. Configurar:
#    - Build Command: npm install
#    - Start Command: node server.js
# 4. Agregar variables de entorno en Dashboard
```

### Opción 2: VPS Propio (DigitalOcean, Linode)

```bash
# En tu VPS
ssh root@tu-ip

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clonar tu repositorio
git clone https://github.com/tu-usuario/comedor-uncp.git
cd comedor-uncp

# Instalar dependencias
npm install

# Usar PM2 para mantener el proceso vivo
npm install -g pm2
pm2 start server.js --name "comedor-api"
pm2 startup
pm2 save

# Configurar Nginx como reverse proxy
sudo apt install nginx

# Editar /etc/nginx/sites-available/default
# Agregar:
# location /api {
#     proxy_pass http://localhost:3000;
# }

sudo systemctl restart nginx
```

---

## Crear APK Nativa {#apk}

### Opción 1: React Native (Más eficiente)

```bash
# Crear proyecto React Native
npx create-expo-app comedor-uncp-native

# Instalar dependencias necesarias
npm install expo-device uuid axios html2canvas react-native-html-to-pdf

# Crear app/index.js similar a client-app.jsx pero en React Native
# Usar AsyncStorage en lugar de localStorage

# Generar APK
npx expo build:android
# O usar EAS:
npx eas build --platform android --profile preview
```

El APK será disponible después del build (±5-10 minutos).

### Opción 2: Capacitor (Wrapper de Web a Native)

```bash
# Crear proyecto Capacitor
npm install -g @capacitor/cli
npx cap init
npm install @capacitor/core @capacitor/android @capacitor/ios

# Agregar plataformas
npx cap add android
npx cap add ios

# Compilar web
npm run build

# Copiar web build a Capacitor
npx cap copy

# Abrir en Android Studio
npx cap open android
# Luego compilar desde Android Studio: Build > Generate Signed Bundle / APK

# El APK estará en: android/app/release/
```

### Opción 3: Cordova (Más antiguo pero simple)

```bash
npm install -g cordova
cordova create comedor-uncp
cd comedor-uncp
cordova platform add android

# Copiar archivos web a www/
# Configurar API_BASE en index.js

cordova build android
# APK en: platforms/android/app/build/outputs/apk/
```

### Distribución del APK

**Opción A: Google Play Store**
- Crear cuenta Google Play Developer ($25 único)
- Firmar APK:
  ```bash
  keytool -genkey -v -keystore comedor-uncp.keystore -keyalg RSA -keysize 2048 -validity 10000
  jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore comedor-uncp.keystore app-release-unsigned.apk alias_name
  ```
- Subir a Google Play Console

**Opción B: Distribución privada**
- Alojar APK en tu servidor
- Compartir link de descarga con clientes
- O usar servicios como Firebase App Distribution

```bash
# Firebase App Distribution
firebase appdistribution:distribute comedor.apk \
  --release-notes "v2.0" \
  --testers "cliente1@gmail.com,cliente2@gmail.com"
```

---

## Guía de Uso {#guía-de-uso}

### Para Clientes

#### 1. Primera Vez

1. Descargar e instalar APK
2. Abrir app → Se genera **Device ID único** automáticamente
3. Ingresar DNI y Código Universitario
4. Si no tienes tickets → Contactar al admin

#### 2. Usar Tickets

1. Ingresar DNI y código
2. Verificar tickets disponibles (debe ser > 0)
3. Click en "Aceptar y Registrar"
4. Pantalla "En Vivo" mostrará countdown
5. 7:00:00.000 → Se disparan automáticamente
6. ✅ Si éxito → Se ve ticket generado
7. 📸 Descargar/capturar ticket
8. Presentar en la puerta del comedor

#### 3. Comprar Tickets

- Contactar administrador
- Proporcionar Device ID (visible en login)
- Admin agrega tickets a la cuenta
- Refrescamos y ya estarán disponibles

### Para Administrador

#### 1. Panel Admin

Acceso: `http://tu-dominio.com/admin`
Token: El que configuraste en `.env`

#### 2. Pestañas Principales

**📱 Dispositivos**
- Ver todos los devices registrados
- Buscar por ID
- Clickear "Editar" para modificar tickets
- Agregar (+), Restar (-), o Establecer (🎯) cantidad
- Eliminar dispositivos

**📋 Registros**
- Ver historial de todos los registros
- Ver último disparo, DNI, estado
- Filtrar por fecha

**📊 Estadísticas**
- Total de dispositivos
- Tickets en el sistema
- Registros totales
- Registros hoy

**⚙️ Configuración**
- Cambiar hora objetivo (ej: 7:00)
- Pre-disparo en ms (recomendado 800-1000ms)
- Número de disparos (recomendado 10)
- Intervalo entre disparos (20-50ms)

#### 3. Flujo de Venta

```
Cliente contacta
    ↓
"Quiero 5 tickets"
    ↓
Admin pide Device ID
    ↓
Cliente comparte: DEV-1234567890-abc123xyz
    ↓
Admin va a Panel → Dispositivos
    ↓
Busca Device ID
    ↓
Click Editar → Agregar → 5 → Confirmar
    ↓
Sistema deduce ticket al usar
    ↓
Cliente recibe ticket exitosamente
```

---

## Modelo de Negocio {#modelo-de-negocio}

### Flujo de Ingresos

```
1. Clientes compran TOKENS/TICKETS
   ├─ 1 ticket = 1 registro comedor
   ├─ Precio: Lo que tú decidas
   └─ Mínimo recomendado: S/. 2-5 por ticket

2. Cada registro:
   ├─ Cliente usa 1 ticket
   ├─ Admin lo deduce automáticamente
   └─ Obtienes acceso garantizado a comedor

3. Estadísticas:
   ├─ Ver cuántos tickets vendiste
   ├─ Ver registros exitosos
   └─ Proyectar ingresos
```

### Recomendaciones de Precios

| Cantidad | Precio Unitario | Total   |
|----------|-----------------|---------|
| 1        | S/. 5.00        | S/. 5   |
| 5        | S/. 4.50        | S/. 22.50 |
| 10       | S/. 4.00        | S/. 40  |
| 20       | S/. 3.50        | S/. 70  |
| 50       | S/. 3.00        | S/. 150 |

### Seguridad y Límites

```javascript
// Agregar en backend para evitar abuso:

// Límite de registros por device por día
const REGISTROS_MAX_POR_DIA = 5;

// Límite de disparos simultáneos
const DISPAROS_MAX_POR_DIA = 50;

// Verificar en POST /api/register:
const hoyRegistros = registrations.filter(r => 
  r.device_id === deviceId && 
  esHoy(r.timestamp)
).length;

if (hoyRegistros >= REGISTROS_MAX_POR_DIA) {
  return res.status(429).json({ error: "Límite diario excedido" });
}
```

---

## Configuración Avanzada

### Integración con UNCP Real

Reemplazar en backend-api.js:

```javascript
app.post("/api/uncp-register", authDevice, async (req, res) => {
  const { dni, codigo } = req.body;

  try {
    // Request real a UNCP
    const response = await fetch("https://comedor.uncp.edu.pe/api/registrar", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `dni=${dni}&codigo=${codigo}`
    });

    const data = await response.json();
    
    if (data.success) {
      res.json({ success: true, ticket: data.ticket });
    } else {
      res.status(400).json({ error: data.message });
    }
  } catch (err) {
    res.status(500).json({ error: "Error al conectar con UNCP" });
  }
});
```

### Base de Datos Persistente

Para producción, usar PostgreSQL:

```bash
# Instalar cliente
npm install pg

# Crear pool de conexión
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Consultas SQL en lugar de Map()
// Crear tablas:
CREATE TABLE devices (
  id VARCHAR(255) PRIMARY KEY,
  tickets INT DEFAULT 0,
  created_at TIMESTAMP,
  last_used TIMESTAMP
);

CREATE TABLE registrations (
  id UUID PRIMARY KEY,
  device_id VARCHAR(255),
  dni VARCHAR(10),
  codigo VARCHAR(20),
  timestamp TIMESTAMP,
  status VARCHAR(20),
  FOREIGN KEY (device_id) REFERENCES devices(id)
);
```

---

## Solución de Problemas

### El contador no llega a 7:00

**Posible causa:** Zona horaria incorrecta
```javascript
// En backend, asegurar:
const target = new Date();
target.setHours(7, 0, 0, 0);
// target debe estar en zona horaria de Perú (GMT-5)

// Configurar en tu servidor:
process.env.TZ = 'America/Lima'
```

### Los disparos no funcionan

**Verificar:**
1. URL del endpoint es correcta
2. método HTTP es POST
3. Headers de Content-Type son correctos
4. El servidor UNCP está activo

**Debug:**
```javascript
// En backend, agregar logs:
console.log(`[REGISTER] Disparando a: ${new Date().toISOString()}`);
console.log(`[REGISTER] Body: ${JSON.stringify(body)}`);
```

### Device ID duplicados

**Solución:**
Limpiar localStorage en cliente:
```javascript
localStorage.removeItem("device_id");
// Recargar app → Nuevo Device ID
```

---

## Contacto y Soporte

Para mejoras o problemas:
- Revisar logs del servidor: `heroku logs --tail`
- Verificar conexión a BD
- Verificar token admin
- Revisar fecha/hora del servidor

---

**Versión:** 2.0
**Última actualización:** 2024
**Licencia:** Privada - Uso exclusivo COMEDOR UNCP
