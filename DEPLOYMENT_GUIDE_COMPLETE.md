# 🚀 GUÍA COMPLETA: De 0 a Producción en 2 Horas

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos)
2. [Fase 1: Preparar Backend](#fase1)
3. [Fase 2: Setup Local](#fase2)
4. [Fase 3: Desplegar en Servidor](#fase3)
5. [Fase 4: Crear APK](#fase4)
6. [Fase 5: Lanzar a Producción](#fase5)

---

## 🔧 Requisitos Previos {#requisitos}

### Paso 1: Instalar Herramientas Necesarias

#### Windows/Mac/Linux

1. **Node.js** (incluye npm)
   - Descargar: https://nodejs.org (LTS)
   - Verificar instalación:
     ```bash
     node --version
     npm --version
     ```

2. **Git** (para control de versiones)
   - Descargar: https://git-scm.com
   - Verificar:
     ```bash
     git --version
     ```

3. **Visual Studio Code** (editor recomendado)
   - Descargar: https://code.visualstudio.com

4. **Expo CLI** (para crear APK)
   ```bash
   npm install -g expo-cli
   ```

5. **Java Development Kit (JDK)** (si creas APK localmente)
   - Descargar: https://www.oracle.com/java/technologies/downloads/
   - O instalar OpenJDK:
     ```bash
     # Windows (con chocolatey)
     choco install openjdk
     
     # Mac
     brew install openjdk
     
     # Linux
     sudo apt install openjdk-11-jdk
     ```

### Paso 2: Crear Cuentas

- [ ] GitHub (para alojar código): https://github.com
- [ ] Heroku (para servidor backend): https://heroku.com
- [ ] Google Play Developer (para publicar APK): https://play.google.com/console ($25 único)

---

## 📦 Fase 1: Preparar Backend {#fase1}

### Paso 1.1: Crear Repositorio GitHub

```bash
# 1. Ir a https://github.com/new
# 2. Crear repositorio: "comedor-uncp"
# 3. Clonar localmente

git clone https://github.com/tu-usuario/comedor-uncp.git
cd comedor-uncp
```

### Paso 1.2: Copiar Archivos Backend

```bash
# Copiar estos archivos al directorio raíz
- backend-api.js  → renombrar a server.js
- package.json
- .env.example    → copiar a .env y editar
```

### Paso 1.3: Configurar .env

```bash
# Editar .env con estos valores:

PORT=3000
ADMIN_TOKEN=tu-token-muy-seguro-abc123xyz789
NODE_ENV=development
TZ=America/Lima
```

### Paso 1.4: Instalar Dependencias

```bash
npm install
```

**Output esperado:**
```
added 15 packages
```

### Paso 1.5: Probar localmente

```bash
npm start
```

**Output esperado:**
```
🚀 COMEDOR UNCP API running on port 3000
📍 Base URL: http://localhost:3000
🔐 Admin Token: tu-token-muy-seguro-abc123xyz789
⏰ Target time: 7:00
```

✅ Backend funcionando. Presionar Ctrl+C para detener.

### Paso 1.6: Subir a GitHub

```bash
git add .
git commit -m "Initial backend setup"
git branch -M main
git push -u origin main
```

---

## 💻 Fase 2: Setup Local (Desarrollo) {#fase2}

### Paso 2.1: Crear App Unificada (Cliente + Admin)

```bash
# En directorio diferente
npx create-react-app comedor-uncp-app
cd comedor-uncp-app
npm install html2canvas
```

### Paso 2.2: Reemplazar App.jsx

```bash
# 1. Copiar unified-app.jsx a src/
# 2. Renombrar a App.jsx
cp ../unified-app.jsx src/App.jsx
```

### Paso 2.3: Verificar URL de API

En `src/App.jsx`, línea ~8:

```javascript
// Para desarrollo local:
const API_BASE = "http://localhost:3000";

// Para producción (cambiar después):
// const API_BASE = "https://tu-api.herokuapp.com";
```

### Paso 2.4: Iniciar App Local

**Terminal 1: Backend**
```bash
cd comedor-uncp  # carpeta del backend
npm start
```

**Terminal 2: Frontend**
```bash
cd comedor-uncp-app
npm start
```

Debería abrir automáticamente `http://localhost:3000` (frontend) mientras backend está en `http://localhost:3000` (diferente proceso).

### Paso 2.5: Probar Flujo Completo

1. **Abrir app** → Ver pantalla de selección (Estudiante / Admin)
2. **Click "Soy Estudiante"**:
   - Ingresar DNI: 72345678
   - Ingresar Código: 2021100001
   - Ver "0 Tickets" (normal)
   - Ver Device ID en consola o en la app

3. **Otra ventana: Click "Soy Administrador"**:
   - Email: `admin@comedor-uncp.com`
   - Password: `admin123456`
   - Click "Ingresar"

4. **En Admin Panel:**
   - Ir a **Dashboard** → Ver estadísticas
   - Ir a **Devices** → Ver dispositivo del paso 2
   - Click **Editar** → **Agregar** → 5 → **✓**
   - El dispositivo ahora tiene 5 tickets

5. **Volver a Estudiante:**
   - Recargar página
   - Ingresar DNI/Código
   - Ver "5 Tickets" ✅

✅ **Sistema funcionando localmente!**

---

## 🌐 Fase 3: Desplegar en Servidor {#fase3}

### Opción A: Heroku (Más Fácil)

#### Paso 3A.1: Crear Cuenta y Instalar Heroku CLI

```bash
# Descargar desde https://devcenter.heroku.com/articles/heroku-cli

# Verificar
heroku --version

# Login
heroku login
```

#### Paso 3A.2: Crear App en Heroku

```bash
cd comedor-uncp  # directorio del backend
heroku create comedor-uncp-api
```

**Output:**
```
Creating ⣾ comedor-uncp-api... done
https://comedor-uncp-api.herokuapp.com/ | https://git.heroku.com/comedor-uncp-api.git
```

#### Paso 3A.3: Configurar Variables de Entorno

```bash
heroku config:set ADMIN_TOKEN="tu-token-super-seguro-xyz123abc"
heroku config:set NODE_ENV="production"
heroku config:set TZ="America/Lima"
```

#### Paso 3A.4: Deployar Backend

```bash
git push heroku main
```

Esperarás 2-3 minutos...

**Output final:**
```
remote: -----> Compressing...
remote: -----> Launching...
remote:        Released v3
remote: https://comedor-uncp-api.herokuapp.com deployed to Heroku
```

#### Paso 3A.5: Verificar que funciona

```bash
heroku logs --tail

# O en navegador:
https://comedor-uncp-api.herokuapp.com/admin/stats
# (Va a dar error de autenticación, pero significa que está vivo)
```

#### Paso 3A.6: Actualizar Frontend a Producción

En `src/App.jsx`, cambiar:

```javascript
const API_BASE = "https://comedor-uncp-api.herokuapp.com";
```

### Opción B: Railway (Más Moderno)

#### Paso 3B.1: Crear Cuenta

- Ir a https://railway.app
- Conectar GitHub
- Importar repositorio `comedor-uncp`

#### Paso 3B.2: Configurar Variables

En el panel de Railway:
- Ir a Variables
- Agregar:
  ```
  PORT=3000
  ADMIN_TOKEN=tu-token-xyz
  NODE_ENV=production
  TZ=America/Lima
  ```

#### Paso 3B.3: Deployar

Railway auto-detecta Node.js y deployea automáticamente con cada push a `main`.

**URL:** `https://comedor-uncp.up.railway.app`

#### Paso 3B.4: Actualizar Frontend

```javascript
const API_BASE = "https://comedor-uncp.up.railway.app";
```

### Opción C: DigitalOcean (VPS Propio)

#### Paso 3C.1: Crear Droplet

- Ir a https://digitalocean.com
- Crear Droplet:
  - OS: Ubuntu 22.04 LTS
  - Plan: $5/mes (suficiente)
  - Region: Disponible en tu zona

#### Paso 3C.2: Conectar SSH

```bash
ssh root@tu-ip-publica

# Cambiar contraseña
passwd

# Actualizar sistema
apt update && apt upgrade -y
```

#### Paso 3C.3: Instalar Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

node --version
```

#### Paso 3C.4: Clonar Código

```bash
git clone https://github.com/tu-usuario/comedor-uncp.git
cd comedor-uncp

npm install
```

#### Paso 3C.5: Instalar PM2 (Mantiene servidor vivo)

```bash
npm install -g pm2

# Iniciar
pm2 start server.js --name "comedor-api"

# Que inicie con el sistema
pm2 startup
pm2 save
```

#### Paso 3C.6: Configurar Nginx (Reverse Proxy)

```bash
apt install nginx

# Editar config
nano /etc/nginx/sites-available/default
```

Reemplazar contenido con:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name tu-dominio.com www.tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Testear
nginx -t

# Reiniciar
systemctl restart nginx
```

#### Paso 3C.7: SSL Gratis (Let's Encrypt)

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d tu-dominio.com
```

Seguir instrucciones. Tu API estará en `https://tu-dominio.com`

**Actualizar Frontend:**

```javascript
const API_BASE = "https://tu-dominio.com";
```

---

## 📱 Fase 4: Crear APK {#fase4}

### Opción A: Con Expo (Recomendado - Sin compilar localmente)

#### Paso 4A.1: Crear Proyecto React Native

```bash
# Crear proyecto Expo
npx create-expo-app comedor-uncp-mobile
cd comedor-uncp-mobile

npm install html2canvas expo-file-system expo-sharing
```

#### Paso 4A.2: Copiar Código

**Convertir `unified-app.jsx` a React Native:**

Copiar contenido al `App.js` pero adaptado para React Native:
- Reemplazar `<div>` con `<View>`
- Reemplazar `<input>` con `<TextInput>`
- Usar `AsyncStorage` en lugar de `localStorage`
- Usar `Alert` en lugar de `alert()`

O usar nuestra versión ya adaptada (si la proporcionamos).

#### Paso 4A.3: Construir APK con EAS

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# Crear build
eas build --platform android --profile preview
```

**Esperar 10-15 minutos...**

Output:
```
✅ Build finished!
📦 Download: https://eas.expo.dev/builds/...apk
```

**Descargar APK desde ese link.**

#### Paso 4A.4: Instalar en Teléfono

**Opción 1: Enviar por email**
```bash
# Copiar link del APK, enviar por Whatsapp/Email
# Abrir en teléfono → Instalar
```

**Opción 2: ADB (conexión USB)**
```bash
adb install comedor-uncp.apk
```

### Opción B: Capacitor (Más integración web)

#### Paso 4B.1: Crear Proyecto Capacitor

```bash
npm install -g @capacitor/cli

npx create-react-app comedor-capacitor
cd comedor-capacitor

# Copiar unified-app.jsx a src/App.jsx

npm install @capacitor/core @capacitor/android
npx cap init
npx cap add android
```

#### Paso 4B.2: Construir APK

```bash
npm run build
npx cap sync
npx cap open android
```

Se abre Android Studio automáticamente.

**En Android Studio:**
1. Build → Generate Signed Bundle/APK
2. Seleccionar APK
3. Next → Crear keystore (o usar existente)
4. Finish

APK estará en: `android/app/release/app-release.apk`

### Opción C: React Native CLI (Más complejo)

```bash
npx react-native init comed orUncp
cd comed orUncp

# Seguir pasos de integración...

# Construir
./gradlew assembleRelease

# APK en: android/app/build/outputs/apk/release/
```

---

## 🎯 Fase 5: Lanzar a Producción {#fase5}

### Paso 5.1: Cambios Finales

#### En Backend (.env)

```bash
NODE_ENV=production
ADMIN_TOKEN=tu-token-super-ultra-secreto-no-cambiar-nunca
DATABASE_URL=postgresql://user:pass@db.com/comedor  # si usas BD
TZ=America/Lima
```

#### En Frontend/APK (src/App.jsx)

```javascript
// Línea 9-10, cambiar a:
const API_BASE = "https://comedor-uncp-api.herokuapp.com";
const ADMIN_EMAIL = "admin@comedor-uncp.com";
const ADMIN_PASSWORD = "contraseña-super-segura"; // CAMBIAR
```

### Paso 5.2: Recompilar APK Final

```bash
# Cambiar URL en código
# Recompilar
eas build --platform android --profile release

# O localmente con:
npm run build  # (React web)
npx cap build android  # (Capacitor)
```

### Paso 5.3: Publicar en Google Play

#### Paso 5.3.1: Crear Cuenta Developer

- Ir a https://play.google.com/console
- Pagar $25
- Crear aplicación: "Comedor UNCP"

#### Paso 5.3.2: Firmar APK

```bash
# Si no está firmado:
keytool -genkey -v -keystore comedor-uncp.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias comedor_uncp

# Firmar APK
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
  -keystore comedor-uncp.keystore \
  app-release.apk comedor_uncp

# Alinear
zipalign -v 4 app-release.apk app-release-final.apk
```

#### Paso 5.3.3: Subir a Google Play

1. En Google Play Console
2. Crear release (Closed Testing first)
3. Subir APK
4. Llenar:
   - Screenshots
   - Descripción
   - Cambios
5. Revisar y publicar

**Google tardará 1-2 horas en revisar.**

✅ **¡Tu APK estará disponible en Google Play!**

### Paso 5.4: Distribución Privada (Alternativa)

Si no quieres pasar por Google Play:

```bash
# Opción 1: Compartir link directo
# Alojar APK en tu servidor
# Compartir link: https://tu-dominio.com/comedor-uncp.apk

# Opción 2: Firebase App Distribution
npm install -g firebase-tools
firebase login
firebase appdistribution:distribute comedor-uncp.apk \
  --release-notes "v1.0 - Lanzamiento" \
  --testers "cliente1@gmail.com,cliente2@gmail.com"

# Opción 3: TestFlight (iOS solo)
```

---

## ✅ Checklist Final de Deployment

### Backend

- [ ] Servidor en vivo (Heroku/Railway/VPS)
- [ ] Variables de entorno configuradas
- [ ] Token admin seguro
- [ ] CORS configurado
- [ ] Logs monitoreados

### Frontend Web

- [ ] URL de API actualizada
- [ ] Credenciales admin correctas
- [ ] Interfaz responsiva
- [ ] Probado en móvil y escritorio

### APK

- [ ] Construido correctamente
- [ ] API_BASE apunta a servidor producción
- [ ] Credenciales almacenadas de forma segura
- [ ] Testeado en Android 10+
- [ ] Permisios configurados (internet, almacenamiento)

### Producción

- [ ] Backup de base de datos configurado
- [ ] Monitoreo de errores (Sentry/LogRocket)
- [ ] Email de notificaciones
- [ ] Documentación actualizada
- [ ] Contacto de soporte visible

---

## 🐛 Troubleshooting

### "La app no conecta al servidor"

**Solución:**
1. Verificar URL en `const API_BASE`
2. Verificar servidor está en vivo: `curl https://tu-api.com`
3. Verificar CORS: `Access-Control-Allow-Origin`
4. En APK: Agregar permiso de internet en `AndroidManifest.xml`

### "Admin login falla"

**Solución:**
1. Verificar credenciales en código
2. Verificar token admin en `.env`
3. Verificar servidor está corriendo

### "APK muy grande"

**Solución:**
```bash
# Excluir módulos no usados
# Usar ProGuard/R8 para ofuscación
# En build.gradle:
minifyEnabled true
shrinkResources true
```

### "APK se queda en negro"

**Solución:**
1. Revisar logcat: `adb logcat`
2. Verificar API_BASE está correcta
3. Probar en Android Studio emulator primero

---

## 📊 Resumen de Tiempos

| Fase | Tarea | Tiempo |
|------|-------|--------|
| 1 | Setup Backend | 15 min |
| 2 | Setup Local | 15 min |
| 3A | Desplegar Heroku | 10 min |
| 3B | Desplegar Railway | 5 min |
| 3C | Desplegar VPS | 30 min |
| 4A | APK con Expo | 20 min (construcción) |
| 4B | APK con Capacitor | 30 min |
| 5 | Google Play | 30 min (+ 2h revisor Google) |

**Total: 2-3 horas desde 0 a producción**

---

## 🚀 Post-Lanzamiento

### Primeros Días

- Monitorear errores en logs
- Recopilar feedback de usuarios
- Hacer correcciones urgentes
- Publicar actualizaciones

### Primeras Semanas

- Análisis de uso
- Optimizaciones de performance
- Agregar features que pidieron
- Expandir a nuevos dispositivos

### Mensualmente

- Auditoría de seguridad
- Backup de datos
- Análisis de ingresos
- Planeación de v2.0

---

## 📞 Soporte Rápido

```bash
# Ver logs en vivo
heroku logs --tail  # Heroku
pm2 logs  # PM2 (VPS)

# Reiniciar servidor
heroku restart  # Heroku
pm2 restart comedor-api  # PM2

# Limpiar caché
npm cache clean --force
Gradle clean  # Android

# Debug APK
adb logcat | grep "comedor"
```

---

**¡FELICIDADES! Ya tienes tu sistema en producción.** 🎉

Siguiente: Marketing y venta a estudiantes 💰

---

*Última actualización: 2024*
*Versión: 2.0*
*Soporte: Completo*
