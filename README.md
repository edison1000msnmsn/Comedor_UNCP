# COMEDOR UNCP PRO

Aplicacion React + backend Express para gestion interna de cupos por DNI y asistencia de registro en la web oficial del comedor UNCP.

## Enfoque actual

- El administrador asigna cupos por DNI y revisa solicitudes.
- El estudiante ingresa DNI y codigo universitario alfanumerico.
- Si tiene cupo, la app copia datos, muestra contador y abre la web oficial hasta 5 minutos antes del horario configurado para que cargue con anticipacion.
- El estudiante completa el formulario y genera el ticket manualmente en `https://comedor.uncp.edu.pe/charola`.
- La app registra la confirmacion interna y guarda un comprobante local.

La app no hace scraping, no automatiza clics y no envia peticiones directas a la pagina oficial UNCP.

## Ejecutar local

1. Instala dependencias:

```bash
npm install
```

2. Crea `.env` desde `.env.example` y cambia credenciales:

```bash
copy .env.example .env
```

3. Inicia backend:

```bash
npm run server
```

4. En otra terminal inicia frontend:

```bash
npm run dev
```

Frontend: `http://127.0.0.1:5173`
Backend: `http://localhost:3000`

## Seguridad de produccion

- Cambia `ADMIN_PASSWORD` y `ADMIN_TOKEN` antes de exponer el servidor.
- Configura `ALLOWED_ORIGINS` con el dominio real del frontend.
- Usa HTTPS y un proxy reverso en produccion.
- El almacenamiento actual es en memoria; para produccion real debe reemplazarse por PostgreSQL.

## Scripts

- `npm run dev`: frontend Vite.
- `npm run build`: compila frontend.
- `npm run preview`: previsualiza build.
- `npm run server`: backend Express.
