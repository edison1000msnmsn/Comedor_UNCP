# 🚀 PROMPT COMPLETO PARA CLAUDE CODE - COMEDOR UNCP PRO v2.1

## CONTEXTO GENERAL

Estoy construyendo un sistema profesional de venta y gestión de tickets para el comedor de la Universidad Nacional del Centro del Perú (UNCP). El sistema debe ser:
- **Dual-role**: Cliente (estudiantes) + Admin (yo) en una sola app
- **Integrado con UNCP real**: Dispara automáticamente a https://comedor.uncp.edu.pe/charola
- **Profesional**: Se vea corporativo, sin errores visuales, sin parecer hecho por IA
- **Listo para producción**: APK, backend en servidor, totalmente funcional
- **Eficiente**: Precisión de milisegundos en disparos automáticos

---

## INSTRUCCIONES PARA CODEX

### FASE 1: REVISAR ESTRUCTURA

```
Tienes descargados estos archivos en tu máquina:
├── unified-app-uncp-real.jsx        (app React unificada)
├── backend-api.js                   (servidor Node.js)
├── package.json                     (dependencias)
├── .env.example                     (variables de entorno)
├── DEPLOYMENT_GUIDE_COMPLETE.md     (guía instalación)
└── database-schema.sql              (estructura BD)

Tu tarea: Mejorar visualmente, optimizar, y asegurar que todo compile y funcione.
```

### FASE 2: MEJORAS VISUALES Y DE UX (CRÍTICO)

Implementa estas mejoras para que se vea profesional:

#### 1. **Animaciones y Transiciones**
- Agregar fade-in/out en cambios de pantalla
- Bounce suave en botones
- Transiciones de color suave (0.3s)
- Loading spinner profesional (no el basico)
- Skeleton loaders mientras carga data

**Código ejemplo:**
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.screen {
  animation: fadeIn 0.4s ease-out;
}

@keyframes buttonHover {
  0% { box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(13, 148, 136, 0); }
  100% { box-shadow: 0 0 0 0 rgba(13, 148, 136, 0); }
}

button:hover {
  animation: buttonHover 0.6s infinite;
}
```

#### 2. **Mejorar Tipografía**
- Usar fuentes profesionales: Inter, Roboto
- Tamaños coherentes con jerarquía clara
- Line-height: 1.5 para legibilidad
- Letter-spacing sutil en títulos

#### 3. **Colores Profesionales**
- Principal: Teal (#0D9488) ✓
- Secundario: Azul profundo (#1E40AF) ✓
- Fondos: Gradientes sutiles
- Estados: Verde éxito (#10B981), Rojo error (#EF4444), Amarillo warning (#F59E0B)

#### 4. **Espaciado Consistente**
- Usar escala: 4px, 8px, 12px, 16px, 24px, 32px
- Padding interior: 16-24px
- Márgenes entre elementos: 8-12px

#### 5. **Iconografía Profesional**
- Emojis son OK para prototipo, pero considera reemplazar con iconos SVG
- O usar emojis menos infantiles: 🎓 en lugar de 👨‍🎓
- Iconos consistentes en tamaño

#### 6. **Componentes Profesionales**
- Cards con sombra sutil (0 2px 8px rgba(0,0,0,0.1))
- Inputs con focus ring visible
- Dropdowns suave con transición
- Modales con backdrop blur
- Toast/notificaciones elegantes

---

## MEJORAS DE CÓDIGO Y FUNCIONALIDAD

### 1. **Estructura de Carpetas Profesional**

```
comedor-uncp-app/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── ClientApp.jsx          # Lógica cliente
│   │   ├── AdminApp.jsx            # Lógica admin
│   │   ├── LoginScreen.jsx         # Login compartido
│   │   ├── LoadingSpinner.jsx      # Spinner profesional
│   │   └── Toast.jsx               # Notificaciones
│   ├── hooks/
│   │   ├── useAPI.js               # Hook para llamadas API
│   │   ├── useAuth.js              # Autenticación
│   │   └── useStorage.js           # LocalStorage wrapper
│   ├── services/
│   │   ├── uncpService.js          # Integración UNCP
│   │   ├── apiService.js           # Llamadas a backend
│   │   └── configService.js        # Gestión de config
│   ├── styles/
│   │   ├── global.css              # Estilos globales
│   │   ├── components.css          # Estilos componentes
│   │   └── animations.css          # Animaciones
│   ├── utils/
│   │   ├── formatting.js           # formatCount, formatTime, etc
│   │   ├── validation.js           # validarDNI, validarCodigo
│   │   └── constants.js            # Constantes app
│   ├── App.jsx                     # App principal
│   ├── App.css
│   └── index.js
├── package.json
├── .env
├── .env.example
├── .gitignore
└── README.md
```

### 2. **Servicios Profesionales**

**uncpService.js:**
```javascript
// Servicio para manejar integraciones con UNCP
export const uncpService = {
  async register(dni, codigo) {
    // Con reintentos automáticos
    // Con manejo de errores
    // Con logging
    // Con timeout
  },
  
  async multiShot(dni, codigo, config) {
    // Dispara múltiples veces
    // Trackea progreso
    // Maneja timeouts
  }
};
```

**apiService.js:**
```javascript
// Wrapper para fetch con autenticación, retry, timeout
export const api = {
  async get(url, options = {}) { },
  async post(url, body, options = {}) { },
  async put(url, body, options = {}) { },
  async delete(url, options = {}) { }
};
```

### 3. **Error Handling Profesional**

```javascript
// En lugar de alert(), usar Toast profesional
const showError = (message, duration = 3000) => {
  // Toast animado que desaparece automáticamente
  // Con ícono ❌, color rojo, transición suave
};

const showSuccess = (message, duration = 3000) => {
  // Toast verde con ✅
};

const showWarning = (message, duration = 3000) => {
  // Toast amarillo con ⚠️
};
```

### 4. **Manejo de Estados Global**

```javascript
// Usar Context API o Zustand para estado global
const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp debe usarse dentro de AppProvider');
  return context;
};
```

### 5. **Validaciones Robustas**

```javascript
// validar DNI peruano (8 dígitos)
export const validateDNI = (dni) => {
  return /^\d{8}$/.test(dni);
};

// Validar código universitario
export const validateCodigo = (codigo) => {
  return /^[0-9]{4,10}$/.test(codigo);
};

// Validar email admin
export const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

---

## MEJORAS VISUALES ESPECÍFICAS

### 1. **Pantalla de Login (Seleccionar Rol)**

```
Mejorar:
- Agregar logo/imagen UNCP
- Animar botones con hover
- Mostrar Device ID de forma elegante (código)
- Agregar footer con versión y fecha
- Fondos con gradiente sutil

CSS:
- Botones: 14px fontWeight, padding 16px
- Hover: scale(1.02) + shadow
- Transición: 0.3s ease
```

### 2. **Pantalla de Cliente (DNI/Código)**

```
Mejorar:
- Inputs con label arriba
- Focus ring teal
- Mostrar contador de tickets visual (círculo con número)
- Validación en tiempo real
- Sugerencia: "DNI debe ser 8 dígitos"
- Device ID visible pero pequeño

Input states:
- Default: border gris
- Focus: border teal, shadow teal
- Error: border rojo, ícono ❌
- Success: border verde, ícono ✓
```

### 3. **Contador En Vivo**

```
Mejorar:
- Número GIGANTE y centrado
- Cambiar color según estado:
  - Esperando: Teal
  - Disparando: Rojo pulsante
  - Éxito: Verde
- Mostrar estado con texto grande
- Log en tiempo real de disparos (opcional)
```

### 4. **Pantalla de Éxito**

```
Mejorar:
- Animación de confetti o celebración
- Ticket con diseño profesional (no básico)
- QR del ticket (si es posible)
- Información clara y jerarquizada
- Botón de descarga destacado
- Datos del ticket legibles pero pequeños
```

### 5. **Admin Dashboard**

```
Mejorar:
- Cards con hover y shadow
- Tabla responsiva
- Búsqueda con icono
- Botones con colores consistentes
- Confirmación antes de eliminar
- Loading states en operaciones
- Notificaciones después de acciones
```

---

## OPTIMIZACIONES DE PERFORMANCE

### 1. **Lazy Loading**

```javascript
// Componentes grandes cargar lazy
const ClientApp = lazy(() => import('./components/ClientApp'));
const AdminApp = lazy(() => import('./components/AdminApp'));

// Con Suspense
<Suspense fallback={<LoadingSpinner />}>
  <ClientApp />
</Suspense>
```

### 2. **Memoización**

```javascript
// Evitar re-renders innecesarios
const TicketCounter = memo(({ tickets }) => (
  <div>{tickets}</div>
));

// useMemo para cálculos costosos
const filteredDevices = useMemo(() => 
  devices.filter(d => d.id.includes(search)),
  [devices, search]
);
```

### 3. **Debouncing**

```javascript
// Búsqueda sin hacer request cada keystroke
const [searchDevice, setSearchDevice] = useState('');
const debouncedSearch = useDebounce(searchDevice, 300);

useEffect(() => {
  loadDevices(debouncedSearch);
}, [debouncedSearch]);
```

### 4. **Optimizar Bundle**

```bash
# Analizar tamaño
npm install --save-dev source-map-explorer
npm run build
npx source-map-explorer 'build/static/js/*.js'
```

---

## SEGURIDAD

### 1. **Proteger Credenciales**

```javascript
// NUNCA hardcodear credenciales
// Usar variables de entorno
const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD;
// O mejor: validar en backend

// En producción:
// - Token JWT con expiración
// - Refresh tokens
// - HttpOnly cookies
```

### 2. **Validar en Backend**

```javascript
// Backend SIEMPRE valida
app.post('/api/register', (req, res) => {
  const { dni, codigo, deviceId } = req.body;
  
  // Validar formato
  if (!validateDNI(dni)) return res.status(400).json({error: 'DNI inválido'});
  
  // Validar que device tiene tickets
  const device = devices.get(deviceId);
  if (!device || device.tickets <= 0) {
    return res.status(403).json({error: 'Sin tickets'});
  }
  
  // Rate limiting
  if (tooManyRequests(deviceId)) {
    return res.status(429).json({error: 'Demasiados intentos'});
  }
});
```

### 3. **CORS Seguro**

```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));
```

---

## TESTING

### 1. **Test Casos Críticos**

```javascript
// Test: Login fallido
// Test: Agregar tickets
// Test: Usar ticket
// Test: Disparar contra UNCP
// Test: Error handling
```

### 2. **Simular UNCP Offline**

```javascript
// Mock para development
if (process.env.REACT_APP_MOCK_UNCP === 'true') {
  // Retornar respuesta simulada
  return { ok: true, status: 200 };
}
```

---

## CARACTERÍSTICAS PROFESIONALES ADICIONALES

### 1. **Logging y Analytics**

```javascript
// Registrar eventos importantes
logEvent('user_login', { deviceId });
logEvent('ticket_used', { deviceId, dni });
logEvent('uncp_request', { status, responseTime });

// Para debugging en producción
```

### 2. **Notificaciones Toast Profesionales**

```javascript
// En lugar de alert()
<Toast 
  type="success"
  message="✅ Ticket agregado exitosamente"
  duration={3000}
  position="top-right"
/>
```

### 3. **Loading States**

```javascript
// En lugar de disabled buttons
{loading ? (
  <button disabled style={{ opacity: 0.6 }}>
    <LoadingSpinner size="small" /> Cargando...
  </button>
) : (
  <button onClick={handleSubmit}>Enviar</button>
)}
```

### 4. **Confirmación Antes de Acciones Destructivas**

```javascript
const handleDelete = (deviceId) => {
  if (window.confirm(`¿Eliminar dispositivo ${deviceId}?`)) {
    // Ejecutar eliminación
  }
};

// Mejor: Modal profesional
<ConfirmDialog
  title="Eliminar dispositivo"
  message={`¿Seguro que deseas eliminar ${deviceId}?`}
  onConfirm={() => deleteDevice(deviceId)}
  confirmText="Eliminar"
  cancelText="Cancelar"
  variant="danger"
/>
```

---

## CONFIGURACIÓN PARA PRODUCCIÓN

### .env (Cambiar antes de deployar)

```env
# Desarrollo
REACT_APP_API_BASE=http://localhost:3000
REACT_APP_UNCP_ENDPOINT=https://comedor.uncp.edu.pe/charola

# Producción
# REACT_APP_API_BASE=https://comedor-uncp-api.herokuapp.com
# REACT_APP_UNCP_ENDPOINT=https://comedor.uncp.edu.pe/charola
```

### Backend .env (Producción)

```env
NODE_ENV=production
PORT=3000
ADMIN_TOKEN=tu-token-super-seguro-abc123xyz789
DATABASE_URL=postgresql://user:pass@db.com/comedor_uncp
ALLOWED_ORIGINS=https://comedor-uncp.com,https://admin.comedor-uncp.com
TZ=America/Lima
```

---

## PASOS PARA IMPLEMENTAR (CODEX)

### Paso 1: Crear Estructura de Carpetas
```bash
mkdir -p src/{components,hooks,services,styles,utils}
```

### Paso 2: Migrar unified-app-uncp-real.jsx a componentes
- Dividir en: ClientApp.jsx, AdminApp.jsx, etc.
- Crear hooks: useAPI, useAuth, useCountdown, etc.
- Crear servicios: uncpService, apiService, etc.

### Paso 3: Agregar Estilos Profesionales
- Crear CSS modular
- Agregar animaciones
- Mejorar responsividad

### Paso 4: Mejorar UX
- Validaciones en tiempo real
- Loading states
- Error handling
- Toast notifications

### Paso 5: Testing
- Probar flujos críticos
- Verificar integraciones
- Revisar en dispositivos móviles

### Paso 6: Optimizar
- Lighthouse audit
- Bundle analysis
- Performance monitoring

---

## CHECKLIST FINAL

- [ ] App compila sin errores
- [ ] Se ve profesional (sin parecer AI-made)
- [ ] Funciona offline gracefully
- [ ] Loading states visibles
- [ ] Error handling elegante
- [ ] Validaciones claras
- [ ] Responsive en móvil
- [ ] Admin panel completo
- [ ] Integración UNCP funciona
- [ ] Backend API estable
- [ ] Variables de entorno configuradas
- [ ] Token admin seguro
- [ ] Log de auditoría
- [ ] Performance optimizado (<3s initial load)
- [ ] APK compila correctamente

---

## RESULTADO FINAL

Una aplicación profesional, moderna, segura y lista para producción que:
- ✅ Se ve corporativa y pulida
- ✅ Funciona 100% offline y online
- ✅ Integra con UNCP real
- ✅ Puede ser publicada en Google Play
- ✅ Gestiona tickets eficientemente
- ✅ No parece hecha por IA
- ✅ Es escalable y mantenible
- ✅ Tiene buena UX/UI

---

**¡Ahora está listo para que Codex construya esto al 100%!**
