# 🎯 COPIA Y PEGA ESTO EN CLAUDE CODE

---

## PROMPT PRINCIPAL

```
CONTEXTO: Estoy construyendo COMEDOR UNCP PRO - un sistema profesional de venta y gestión de tickets para el comedor de la UNCP. 

ARQUITECTURA:
- Frontend unificado (Cliente + Admin en una app React)
- Backend Node.js con Express
- Integración real con https://comedor.uncp.edu.pe/charola
- Debe verse profesional (sin parecer IA)
- APK para Android
- Token-based auth

REQUISITOS TÉCNICOS:
1. Estructura de carpetas profesional (src/components, src/services, src/hooks, src/utils)
2. Componentes React separados y reutilizables
3. Servicios para API calls, UNCP integration, config
4. Error handling elegante con toasts/notificaciones
5. Validaciones robustas en cliente y servidor
6. Animaciones sutiles pero profesionales
7. Responsive design (móvil-first)
8. Performance optimizado (lazy loading, memoization)
9. Security: validación backend, CORS, token management

FUNCIONALIDADES:
1. CLIENTE:
   - Login: DNI (8 dígitos) + Código universitario
   - Mostrar tickets disponibles
   - Seleccionar y confirmar registro
   - Contador hacia hora objetivo (7:00 AM default)
   - Disparos automáticos múltiples a UNCP
   - Pantalla de éxito con ticket descargable
   - Auto-fill de datos si es posible

2. ADMIN:
   - Login protegido (email/password)
   - Dashboard con KPIs (devices, tickets, registros, registros hoy)
   - Gestión de dispositivos:
     * Buscar por device ID
     * Ver tickets actuales
     * Agregar/restar/establecer tickets
     * Eliminar dispositivos
   - Ver registros históricos
   - Configuración en vivo (hora objetivo, disparos, intervalos)

MEJORAS VISUALES:
1. Colores profesionales:
   - Primario: #0D9488 (Teal)
   - Secundario: #1E40AF (Azul)
   - Fondo: #0F172A (Oscuro)
   - Cards: #1E293B
   
2. Animaciones:
   - Fade-in en pantallas
   - Hover con scale y shadow
   - Loading spinners suave
   - Transiciones 0.3s ease
   
3. Componentes:
   - Cards con shadow sutil
   - Inputs con focus ring
   - Botones con ripple effect
   - Modales con blur backdrop
   - Toast notifications elegantes
   
4. Tipografía:
   - Fuente: System stack (-apple-system, BlinkMacSystemFont, sans-serif)
   - Títulos: 20-24px, fontWeight 800
   - Botones: 14px, fontWeight 700
   - Labels: 11px, fontWeight 600, color #94A3B8

INTEGRACIÓN UNCP:
```javascript
// Endpoint real
const UNCP_ENDPOINT = "https://comedor.uncp.edu.pe/charola";

// Enviar datos (adaptar según respuesta real):
async function sendToUNCP(dni, codigo) {
  try {
    const response = await fetch(UNCP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni, codigo, timestamp: new Date().toISOString() })
    });
    return response.ok;
  } catch (error) {
    console.error('UNCP error:', error);
    return false;
  }
}

// Múltiples disparos (ráfaga)
async function fireShots(dni, codigo, config = { shots: 10, interval: 20 }) {
  let successCount = 0;
  for (let i = 0; i < config.shots; i++) {
    const success = await sendToUNCP(dni, codigo);
    if (success) successCount++;
    if (i < config.shots - 1) await sleep(config.interval);
  }
  return successCount;
}
```

ESTRUCTURA DE CARPETAS A CREAR:

```
comedor-uncp-app/
├── src/
│   ├── components/
│   │   ├── ClientApp.jsx          // Pantallas cliente
│   │   ├── AdminApp.jsx            // Pantallas admin
│   │   ├── LoginScreen.jsx         // Login compartido
│   │   ├── LoadingSpinner.jsx      // Spinner profesional
│   │   ├── Toast.jsx               // Notificaciones
│   │   └── ConfirmDialog.jsx       // Modal confirmación
│   ├── hooks/
│   │   ├── useAPI.js               // Wrapper fetch con retry/timeout
│   │   ├── useAuth.js              // Gestión autenticación
│   │   ├── useCountdown.js         // Countdown timer
│   │   ├── useStorage.js           // LocalStorage wrapper
│   │   └── useDebounce.js          // Debouncing
│   ├── services/
│   │   ├── uncpService.js          // Llamadas a UNCP
│   │   ├── apiService.js           // Llamadas a backend
│   │   ├── storageService.js       // Manejo de storage
│   │   └── configService.js        // Gestión de config
│   ├── styles/
│   │   ├── global.css              // Reset, variables, globales
│   │   ├── components.css          // Estilos componentes
│   │   └── animations.css          // @keyframes
│   ├── utils/
│   │   ├── formatting.js           // formatCountdown, formatTime
│   │   ├── validation.js           // validateDNI, validateCodigo
│   │   ├── constants.js            // Config constantes
│   │   └── helpers.js              // Utilidades varias
│   ├── App.jsx                     // Componente raíz
│   ├── App.css
│   └── index.js
├── public/
│   ├── index.html                  // Mejorar head, favicon
│   └── favicon.ico
├── package.json
├── .env
└── .gitignore
```

VARIABLES DE ENTORNO (.env):

```env
# API Backend
REACT_APP_API_BASE=http://localhost:3000

# Endpoint UNCP Real
REACT_APP_UNCP_ENDPOINT=https://comedor.uncp.edu.pe/charola

# Modo desarrollo
REACT_APP_MOCK_UNCP=false
REACT_APP_DEBUG=false

# Admin (cambiar en producción)
REACT_APP_ADMIN_EMAIL=admin@comedor-uncp.com
REACT_APP_ADMIN_PASSWORD=admin123456
```

DEPENDENCIAS A INSTALAR:

```bash
npm install html2canvas axios
npm install --save-dev @tailwindcss/forms
```

CHECKLIST DE FUNCIONALIDAD:

Login/Auth:
- [ ] Selección de rol (Cliente/Admin) en pantalla principal
- [ ] Login cliente: DNI (8 dígitos) + Código
- [ ] Validación en tiempo real
- [ ] Auto-fill si es posible
- [ ] Login admin: Email + Password
- [ ] Protección de rutas

Cliente - Registro:
- [ ] Mostrar tickets disponibles
- [ ] Confirmar costo (1 ticket)
- [ ] Pantalla "En Vivo" con countdown
- [ ] Obtener hora objetivo del backend
- [ ] Disparar automáticamente
- [ ] Mostrar logs de disparos
- [ ] Pantalla de éxito con ticket
- [ ] Descargar ticket PNG

Admin - Dashboard:
- [ ] 4 cards KPI (devices, tickets, registros, registros hoy)
- [ ] Tabla de dispositivos con búsqueda
- [ ] Click editar device
- [ ] Modal para agregar/restar/establecer tickets
- [ ] Confirmación antes de eliminar
- [ ] Notificaciones después de operaciones
- [ ] Historial de registros
- [ ] Configuración en vivo (hora, disparos, intervalo)

Integración UNCP:
- [ ] Enviar datos a endpoint real
- [ ] Manejo de errores UNCP
- [ ] Mostrar respuesta (debug mode)
- [ ] Múltiples intentos
- [ ] Timeout handling

UX/UI:
- [ ] Animaciones suave en transiciones
- [ ] Loading states visibles
- [ ] Error toast rojo
- [ ] Success toast verde
- [ ] Warning toast amarillo
- [ ] Focus ring en inputs (teal)
- [ ] Hover effects en botones
- [ ] Responsive en móvil

INSTRUCCIONES DE COMPILACIÓN:

1. Crear estructura de carpetas:
```bash
mkdir -p src/{components,hooks,services,styles,utils}
```

2. Crear archivos en orden:
   - utils/constants.js
   - utils/formatting.js
   - utils/validation.js
   - services/apiService.js
   - services/uncpService.js
   - hooks/useAPI.js
   - hooks/useCountdown.js
   - components/LoadingSpinner.jsx
   - components/Toast.jsx
   - components/LoginScreen.jsx
   - components/ClientApp.jsx
   - components/AdminApp.jsx
   - App.jsx
   - styles/global.css
   - styles/animations.css

3. Compilar y testear:
```bash
npm start
```

4. Testing manual:
   - Cliente login → registrar
   - Admin login → editar device
   - Verificar integración UNCP
   - Probar en móvil
   - Revisar performance (Lighthouse)

TONO Y ESTILO:
- Código limpio y bien documentado
- Nombres de variables en inglés descriptivos
- Comentarios solo donde sea necesario
- Funciones pequeñas y reutilizables
- Sin console.log en producción
- Error messages amigables en español

NO HACER:
- No hardcodear valores
- No usar alert() - usar Toast
- No estilos inline excepto cuando sea necesario
- No componentes monolíticos
- No promesas sin manejo de error
- No duplicar código
- No colors picker/hex mágicos - usar constants

PRIORIDAD:
1. Funcionalidad CRÍTICA (login, tickets, disparos)
2. Error handling robusto
3. Mejoras visuales
4. Optimizaciones
5. Features adicionales

¡EMPIEZA AHORA! Crea el proyecto limpio, modular, profesional y listo para producción.
```

---

## PARA AGILIZAR MÁS (Copia esto si lo quieres todavía más específico)

```
DESPUÉS DE HACER LO ANTERIOR, AGREGAR ESTAS MEJORAS:

1. ANIMACIONES EN global.css:

@keyframes fadeIn {
  from { 
    opacity: 0; 
    transform: translateY(20px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.screen {
  animation: fadeIn 0.4s ease-out;
}

.spinner {
  animation: spin 1s linear infinite;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
  transition: all 0.3s ease;
}

2. VALIDACIONES EN validation.js:

export const validateDNI = (dni) => {
  return /^\d{8}$/.test(dni) && dni.length === 8;
};

export const validateCodigo = (codigo) => {
  return /^[0-9]{4,10}$/.test(codigo);
};

export const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

3. HACER Toast reutilizable:

function Toast({ type = 'info', message, duration = 3000 }) {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  const colors = {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6'
  };
  
  return (
    <div style={{...}}>
      {icons[type]} {message}
    </div>
  );
}

4. LoadingSpinner profesional:

function LoadingSpinner({ size = 'medium', text = 'Cargando...' }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="spinner" style={{ 
        width: size === 'small' ? '20px' : '40px',
        height: size === 'small' ? '20px' : '40px'
      }} />
      {text && <p>{text}</p>}
    </div>
  );
}

5. Hook useCountdown profesional:

function useCountdown(targetHour, targetMinute) {
  const [countdown, setCountdown] = useState('00:00:00');
  const [targetReached, setTargetReached] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const target = new Date();
      target.setHours(targetHour, targetMinute, 0, 0);
      
      if (target <= now) {
        target.setDate(target.getDate() + 1);
        setTargetReached(false);
      }
      
      const diff = target - now;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      setCountdown(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
      
      if (diff <= 0) setTargetReached(true);
    }, 100);
    
    return () => clearInterval(interval);
  }, [targetHour, targetMinute]);
  
  return { countdown, targetReached };
}
```

---

## COPIA Y PEGA ESTO EN CODEX LÍNEA POR LÍNEA 👇

```
Necesito que construyas una aplicación profesional React con las siguientes especificaciones exactas:

NOMBRE: COMEDOR UNCP PRO v2.1
TIPO: App unificada (Cliente + Admin)
TECNOLOGÍA: React 18, Node.js Express backend
DESPLIEGUE: APK Android + Servidor Cloud

PASO 1 - Crea la estructura:
- src/components (ClientApp, AdminApp, LoginScreen, LoadingSpinner, Toast, ConfirmDialog)
- src/hooks (useAPI, useAuth, useCountdown, useStorage, useDebounce)
- src/services (uncpService, apiService, storageService, configService)
- src/utils (formatting, validation, constants, helpers)
- src/styles (global.css, components.css, animations.css)

PASO 2 - Implementa utilidades (sin UI):
- formatCountdown(ms) → "HH:MM:SS"
- formatTime(ms) → "SS.MMM"
- validateDNI(dni) → boolean (8 dígitos)
- validateCodigo(codigo) → boolean
- validateEmail(email) → boolean

PASO 3 - Implementa servicios:

uncpService.js:
- uncpService.register(dni, codigo) → Promise
- uncpService.fireShots(dni, codigo, config) → Promise { successCount, logs }

apiService.js:
- api.get(url, options) → Promise
- api.post(url, body, options) → Promise
- Con retry automático (3 intentos)
- Con timeout (5s)
- Con manejo de errores

PASO 4 - Implementa hooks:

useCountdown(hour, minute):
- return { countdown: "HH:MM:SS", targetReached: boolean }

useAPI(url, options):
- return { data, loading, error, refetch }

PASO 5 - Componentes básicos:

LoadingSpinner: Animación suave, con texto
Toast: type="success|error|warning|info", auto-dismiss en 3s
ConfirmDialog: Modal con dos botones, backdrop blur

PASO 6 - Pantalla Login (compartida):

Muestra dos botones:
- "👨‍🎓 Soy Estudiante" → ClientApp
- "🔑 Soy Administrador" → AdminApp
Mostrar Device ID en footer (monospace, pequeño)
Mostrar versión: v2.1 PRODUCTION READY

PASO 7 - ClientApp (Pantallas cliente):

Pantalla 1 - Login:
  Inputs: DNI (maxLength 8), Código
  Validación en tiempo real
  Mostrar card con tickets disponibles
  Botón "Continuar" (deshabilitado si vacío)
  
Pantalla 2 - Confirmar:
  Mostrar DNI y Código
  Mostrar: "Se enviará a: https://comedor.uncp.edu.pe/charola"
  Card con costo (1 ticket)
  Botón "✓ Aceptar" (con loading)
  Botón "✕ Cancelar"
  
Pantalla 3 - En Vivo:
  Status badge (Esperando/Disparando/Éxito/Error)
  CONTADOR GIGANTE "HH:MM:SS" en teal
  Si disparando: mostrar log de disparos en tiempo real
  Botón "Cancelar" solo si esperando
  Si error: mostrar error UNCP (debug)
  
Pantalla 4 - Éxito:
  Ícono gigante ✅
  Título: "¡Registrado en UNCP!"
  Texto: "X de Y disparos exitosos"
  Ticket card:
    - Número único (basado en timestamp)
    - DNI
    - Código
    - Hora exacta
    - Endpoint (acortado)
  Botón "📸 Descargar Ticket" (PNG)
  Botón "Nuevo Registro"

PASO 8 - AdminApp (Panel admin):

Login:
  Inputs: Email, Password
  Validación
  
Dashboard:
  4 Cards KPI:
    - 📱 Dispositivos: número
    - 🎫 Tickets disponibles: número
    - 📋 Registros totales: número
    - 📊 Registros hoy: número
  
Dispositivos:
  Input buscar device ID
  Lista de devices (cards):
    - Device ID (monospace, acortado)
    - Número de tickets (grande, teal si >0, rojo si 0)
    - Click → abrir modal editar
    
  Modal editar:
    3 botones: ➕ Agregar, ➖ Restar, 🎯 Establecer
    Input número
    Botón ✓ Confirmar
    Botón ✕ Cancelar
    Mostrar tickets actuales

Registros:
  Tabla:
    - Timestamp
    - DNI
    - Código
    - Estado (success/error)
  Últimos 50

Configuración:
  Sliders para cada parámetro:
    - Hora objetivo (0-23)
    - Minuto objetivo (0-59)
    - Pre-disparo ms (0-5000)
    - Número de disparos (1-50)
    - Intervalo ms (0-1000)
  Mostrar resumen de cobertura temporal

PASO 9 - Estilos profesionales:

Colors.js:
  TEAL = "#0D9488"
  BLUE = "#1E40AF"
  DARK = "#0F172A"
  CARD = "#1E293B"
  BORDER = "#334155"
  SUCCESS = "#10B981"
  ERROR = "#EF4444"
  WARNING = "#F59E0B"

Animaciones en animations.css:
  @keyframes fadeIn: translateY(20px) → translate(0)
  @keyframes spin: rotate(0deg) → rotate(360deg)
  @keyframes pulse: opacity 1 → 0.5 → 1
  Botones: hover scale(1.02) + shadow teal
  Inputs: focus border teal + shadow

Global.css:
  * {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  Body: background #0F172A, color #CBD5E1
  Variables CSS para colores
  Reset de estilos

PASO 10 - Testing:

[ ] App compila sin errores
[ ] Puedo hacer login como cliente
[ ] Puedo hacer login como admin
[ ] Veo tickets disponibles
[ ] Puedo editar device (agregar/restar)
[ ] Countdown funciona correctamente
[ ] Disparos se envían a UNCP
[ ] Pantalla de éxito muestra bien
[ ] Toast notifications funcionan
[ ] Responsive en móvil (testeado)
[ ] Sin console.log en código final
[ ] Variables de entorno funcionan

RESULTADO ESPERADO:
- Aplicación profesional, lista para APK
- Se ve corporativo (sin parecer IA)
- Funciona 100% offline y online
- Integra con UNCP real
- Admin puede gestionar devices y tickets
- Clientes pueden registrarse automáticamente
- Performance optimizado
- Error handling robusto
```

---

**¡LISTO! Copia el prompt de la sección "PARA AGILIZAR MÁS" o el final completo directamente en Claude Code y ejecútalo.** 🚀

Presentaré ahora los archivos finales:
