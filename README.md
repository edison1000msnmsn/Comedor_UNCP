# COMEDOR UNCP PRO

Aplicacion React + backend Express para gestion de tickets del comedor UNCP.

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
- Mantiene `MOCK_UNCP=true` hasta tener autorizacion y contrato tecnico para usar el endpoint UNCP.
- Configura `ALLOWED_ORIGINS` con el dominio real del frontend.
- Usa HTTPS y un proxy reverso en produccion.
- El almacenamiento actual es en memoria; para produccion real debe reemplazarse por PostgreSQL.

## Scripts

- `npm run dev`: frontend Vite.
- `npm run build`: compila frontend.
- `npm run preview`: previsualiza build.
- `npm run server`: backend Express.
