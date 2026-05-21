import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { v4 as uuidv4 } from "uuid";

dotenv.config({ override: true });

const app = express();

function cleanEnv(value, fallback = "") {
  return String(value ?? fallback)
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

const PORT = Number(cleanEnv(process.env.PORT, "3000"));
const ADMIN_EMAIL = cleanEnv(process.env.ADMIN_EMAIL, "admin@comedor-uncp.com");
const ADMIN_PASSWORD = cleanEnv(process.env.ADMIN_PASSWORD, "change-this-password");
const ADMIN_TOKEN = cleanEnv(process.env.ADMIN_TOKEN, "change-this-token");
const MOCK_UNCP = cleanEnv(process.env.MOCK_UNCP, "true") === "true";
const UNCP_ENDPOINT = cleanEnv(process.env.UNCP_ENDPOINT, "https://comedor.uncp.edu.pe/charola");
const allowedOrigins = cleanEnv(
  process.env.ALLOWED_ORIGINS,
  "capacitor://localhost,http://localhost,http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => cleanEnv(origin))
  .filter(Boolean);

const devices = new Map();
const registrations = [];
const config = {
  targetHour: 7,
  targetMinute: 0,
  preFireMs: 800,
  shots: 5,
  intervalMs: 80
};

app.use(helmet());
app.use(express.json({ limit: "128kb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

function ensureDevice(deviceId) {
  if (!devices.has(deviceId)) {
    devices.set(deviceId, { tickets: 0, created_at: new Date().toISOString(), last_used: null });
  }
  return devices.get(deviceId);
}

function validateDNI(dni) {
  return /^\d{8}$/.test(String(dni || ""));
}

function validateCodigo(codigo) {
  return /^\d{4,12}$/.test(String(codigo || ""));
}

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || token !== ADMIN_TOKEN) return res.status(401).json({ error: "Unauthorized" });
  return next();
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return true;
  if (origin.startsWith("capacitor://")) return true;
  if (origin === "http://localhost" || origin.startsWith("http://localhost:")) return true;
  if (origin === "http://127.0.0.1" || origin.startsWith("http://127.0.0.1:")) return true;
  if (origin.endsWith(".up.railway.app")) return true;
  return false;
}

async function forwardToUncp({ dni, codigo, shotNumber }) {
  if (MOCK_UNCP) {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return { success: true, status: 200, message: "MOCK_UNCP activo", body: { shotNumber } };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(UNCP_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dni, codigo, timestamp: new Date().toISOString() }),
      signal: controller.signal
    });
    const body = await response.text();
    return {
      success: response.ok,
      status: response.status,
      message: response.ok ? "Aceptado por endpoint UNCP" : `UNCP HTTP ${response.status}`,
      body: body.slice(0, 500)
    };
  } finally {
    clearTimeout(timeout);
  }
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "comedor-uncp-api",
    mockUncp: MOCK_UNCP,
    port: PORT,
    allowedOrigins,
    time: new Date().toISOString()
  });
});

app.get("/", (_req, res) => {
  res.type("text/plain").send("COMEDOR UNCP API is running. Use /health for status.");
});

app.post("/admin/login", (req, res) => {
  const { email, password } = req.body || {};
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Credenciales invalidas" });
  }
  return res.json({ token: ADMIN_TOKEN });
});

app.get("/api/device/:deviceId/tickets", (req, res) => {
  const device = ensureDevice(req.params.deviceId);
  res.json({ tickets: device.tickets });
});

app.post("/api/device/:deviceId/use-ticket", (req, res) => {
  const device = ensureDevice(req.params.deviceId);
  if (device.tickets <= 0) return res.status(403).json({ error: "Sin tickets disponibles" });
  device.tickets -= 1;
  device.last_used = new Date().toISOString();
  res.json({ tickets_remaining: device.tickets });
});

app.post("/api/device/:deviceId/uncp-register", async (req, res, next) => {
  try {
    const device = ensureDevice(req.params.deviceId);
    const { dni, codigo, shotNumber } = req.body || {};
    if (!validateDNI(dni)) return res.status(400).json({ error: "DNI invalido" });
    if (!validateCodigo(codigo)) return res.status(400).json({ error: "Codigo invalido" });
    if (device.tickets <= 0) return res.status(403).json({ error: "Sin tickets disponibles" });

    const response = await forwardToUncp({ dni, codigo, shotNumber });
    const registration = {
      id: uuidv4(),
      device_id: req.params.deviceId,
      dni,
      codigo,
      shot_number: shotNumber || 1,
      timestamp: new Date().toISOString(),
      status: response.success ? "success" : "error",
      upstream_status: response.status,
      message: response.message
    };
    registrations.push(registration);

    res.status(response.success ? 200 : 502).json({
      success: response.success,
      registration_id: registration.id,
      message: response.message
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/config/target-time", (_req, res) => {
  res.json(config);
});

app.get("/admin/devices", requireAdmin, (_req, res) => {
  const list = Array.from(devices.entries()).map(([id, data]) => ({ id, ...data }));
  res.json({ devices: list });
});

app.get("/admin/registrations", requireAdmin, (_req, res) => {
  res.json({ total: registrations.length, registrations: registrations.slice(-100) });
});

app.get("/admin/stats", requireAdmin, (_req, res) => {
  const today = new Date().toDateString();
  res.json({
    total_devices: devices.size,
    total_tickets_in_system: Array.from(devices.values()).reduce((sum, item) => sum + item.tickets, 0),
    total_registrations: registrations.length,
    registrations_today: registrations.filter((item) => new Date(item.timestamp).toDateString() === today).length
  });
});

app.get("/admin/config", requireAdmin, (_req, res) => {
  res.json({ config });
});

app.post("/admin/config", requireAdmin, (req, res) => {
  for (const key of ["targetHour", "targetMinute", "preFireMs", "shots", "intervalMs"]) {
    if (req.body[key] !== undefined) config[key] = Number(req.body[key]);
  }
  config.targetHour = Math.min(23, Math.max(0, config.targetHour));
  config.targetMinute = Math.min(59, Math.max(0, config.targetMinute));
  config.preFireMs = Math.min(5000, Math.max(0, config.preFireMs));
  config.shots = Math.min(20, Math.max(1, config.shots));
  config.intervalMs = Math.min(1000, Math.max(0, config.intervalMs));
  res.json({ config });
});

function parseAmount(req, res) {
  const amount = Number(req.body?.amount);
  if (!Number.isInteger(amount) || amount < 0) {
    res.status(400).json({ error: "Cantidad invalida" });
    return null;
  }
  return amount;
}

app.post("/admin/devices/:deviceId/add-tickets", requireAdmin, (req, res) => {
  const amount = parseAmount(req, res);
  if (amount === null || amount === 0) return;
  const device = ensureDevice(req.params.deviceId);
  device.tickets += amount;
  res.json({ device_id: req.params.deviceId, tickets_total: device.tickets });
});

app.post("/admin/devices/:deviceId/subtract-tickets", requireAdmin, (req, res) => {
  const amount = parseAmount(req, res);
  if (amount === null || amount === 0) return;
  const device = ensureDevice(req.params.deviceId);
  device.tickets = Math.max(0, device.tickets - amount);
  res.json({ device_id: req.params.deviceId, tickets_total: device.tickets });
});

app.post("/admin/devices/:deviceId/set-tickets", requireAdmin, (req, res) => {
  const amount = parseAmount(req, res);
  if (amount === null) return;
  const device = ensureDevice(req.params.deviceId);
  device.tickets = amount;
  res.json({ device_id: req.params.deviceId, tickets_total: device.tickets });
});

app.delete("/admin/devices/:deviceId", requireAdmin, (req, res) => {
  devices.delete(req.params.deviceId);
  res.json({ message: "Dispositivo eliminado" });
});

app.use((error, _req, res, _next) => {
  const message = error.name === "AbortError" ? "UNCP timeout" : error.message || "Internal server error";
  res.status(500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`COMEDOR UNCP API listening on http://localhost:${PORT}`);
  console.log(`MOCK_UNCP=${MOCK_UNCP}`);
});
