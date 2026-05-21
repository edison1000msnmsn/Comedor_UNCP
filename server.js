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
const UNCP_ENDPOINT = cleanEnv(process.env.UNCP_ENDPOINT, "https://comedor.uncp.edu.pe/charola");
const allowedOrigins = cleanEnv(
  process.env.ALLOWED_ORIGINS,
  "capacitor://localhost,http://localhost,http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => cleanEnv(origin))
  .filter(Boolean);

const devices = new Map();
const students = new Map();
const registrations = [];
const ticketRequests = [];
const config = {
  targetHour: 7,
  targetMinute: 0,
  openAheadSeconds: 60
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

function ensureStudent(dni, data = {}) {
  if (!students.has(dni)) {
    students.set(dni, {
      dni,
      codigo: data.codigo || "",
      tickets: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_device_id: data.deviceId || null
    });
  }
  const student = students.get(dni);
  if (data.codigo) student.codigo = data.codigo;
  if (data.deviceId) student.last_device_id = data.deviceId;
  student.updated_at = new Date().toISOString();
  return student;
}

function validateDNI(dni) {
  return /^\d{8}$/.test(String(dni || ""));
}

function validateCodigo(codigo) {
  return /^[A-Za-z0-9-]{4,16}$/.test(String(codigo || ""));
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

async function recordAssistedConfirmation() {
  await new Promise((resolve) => setTimeout(resolve, 20));
  return {
    success: true,
    status: 200,
    message: "Confirmacion asistida registrada. No se enviaron solicitudes a UNCP."
  };
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "comedor-uncp-api",
    mode: "assisted_manual",
    officialEndpoint: UNCP_ENDPOINT,
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

app.get("/api/student/:dni/tickets", (req, res) => {
  const { dni } = req.params;
  if (!validateDNI(dni)) return res.status(400).json({ error: "DNI invalido" });
  const student = ensureStudent(dni, { deviceId: req.query.deviceId });
  res.json({ dni, tickets: student.tickets });
});

app.post("/api/student/:dni/request-ticket", (req, res) => {
  const { dni } = req.params;
  const { codigo, deviceId } = req.body || {};
  if (!validateDNI(dni)) return res.status(400).json({ error: "DNI invalido" });
  if (!validateCodigo(codigo)) return res.status(400).json({ error: "Codigo invalido" });

  const student = ensureStudent(dni, { codigo, deviceId });
  const existing = ticketRequests.find((request) => request.dni === dni && request.status === "pending");
  if (existing) {
    return res.json({ request: existing, tickets: student.tickets, message: "Solicitud pendiente existente" });
  }

  const request = {
    id: uuidv4(),
    dni,
    codigo,
    device_id: deviceId || null,
    status: "pending",
    timestamp: new Date().toISOString()
  };
  ticketRequests.push(request);
  res.status(201).json({ request, tickets: student.tickets, message: "Solicitud registrada" });
});

app.post("/api/student/:dni/use-ticket", (req, res) => {
  const { dni } = req.params;
  if (!validateDNI(dni)) return res.status(400).json({ error: "DNI invalido" });
  const student = ensureStudent(dni);
  if (student.tickets <= 0) return res.status(403).json({ error: "Sin tickets disponibles" });
  student.tickets -= 1;
  student.updated_at = new Date().toISOString();
  res.json({ tickets_remaining: student.tickets });
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
    const { dni, codigo } = req.body || {};
    if (!validateDNI(dni)) return res.status(400).json({ error: "DNI invalido" });
    if (!validateCodigo(codigo)) return res.status(400).json({ error: "Codigo invalido" });
    const student = ensureStudent(dni, { codigo, deviceId: req.params.deviceId });
    if (student.tickets <= 0) return res.status(403).json({ error: "Sin tickets disponibles" });

    const response = await recordAssistedConfirmation();
    const registration = {
      id: uuidv4(),
      device_id: req.params.deviceId,
      dni,
      codigo,
      method: "assisted_manual",
      shot_number: 1,
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

app.get("/admin/students", requireAdmin, (_req, res) => {
  const list = Array.from(students.values()).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  res.json({ students: list });
});

app.get("/admin/ticket-requests", requireAdmin, (_req, res) => {
  res.json({
    total: ticketRequests.length,
    requests: ticketRequests.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  });
});

app.post("/admin/ticket-requests/:requestId/resolve", requireAdmin, (req, res) => {
  const request = ticketRequests.find((item) => item.id === req.params.requestId);
  if (!request) return res.status(404).json({ error: "Solicitud no encontrada" });
  request.status = req.body?.status === "rejected" ? "rejected" : "approved";
  request.resolved_at = new Date().toISOString();
  res.json({ request });
});

app.get("/admin/registrations", requireAdmin, (_req, res) => {
  res.json({ total: registrations.length, registrations: registrations.slice(-100) });
});

app.get("/admin/stats", requireAdmin, (_req, res) => {
  const today = new Date().toDateString();
  const deviceTickets = Array.from(devices.values()).reduce((sum, item) => sum + item.tickets, 0);
  const studentTickets = Array.from(students.values()).reduce((sum, item) => sum + item.tickets, 0);
  res.json({
    total_devices: devices.size,
    total_students: students.size,
    pending_requests: ticketRequests.filter((item) => item.status === "pending").length,
    total_tickets_in_system: deviceTickets + studentTickets,
    total_registrations: registrations.length,
    registrations_today: registrations.filter((item) => new Date(item.timestamp).toDateString() === today).length
  });
});

function studentTicketOperation(req, res, operation) {
  const { dni } = req.params;
  if (!validateDNI(dni)) return res.status(400).json({ error: "DNI invalido" });
  const amount = parseAmount(req, res);
  if (amount === null) return undefined;
  const student = ensureStudent(dni, { codigo: req.body?.codigo });

  if (operation === "add") student.tickets += amount;
  if (operation === "subtract") student.tickets = Math.max(0, student.tickets - amount);
  if (operation === "set") student.tickets = amount;

  student.updated_at = new Date().toISOString();
  return res.json({ dni, tickets_total: student.tickets, student });
}

app.post("/admin/students/:dni/add-tickets", requireAdmin, (req, res) => {
  studentTicketOperation(req, res, "add");
});

app.post("/admin/students/:dni/subtract-tickets", requireAdmin, (req, res) => {
  studentTicketOperation(req, res, "subtract");
});

app.post("/admin/students/:dni/set-tickets", requireAdmin, (req, res) => {
  studentTicketOperation(req, res, "set");
});

app.get("/admin/config", requireAdmin, (_req, res) => {
  res.json({ config });
});

app.post("/admin/config", requireAdmin, (req, res) => {
  for (const key of ["targetHour", "targetMinute", "openAheadSeconds"]) {
    if (req.body[key] !== undefined) config[key] = Number(req.body[key]);
  }
  config.targetHour = Math.min(23, Math.max(0, config.targetHour));
  config.targetMinute = Math.min(59, Math.max(0, config.targetMinute));
  config.openAheadSeconds = Math.min(300, Math.max(0, config.openAheadSeconds));
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
  const message = error.name === "AbortError" ? "Tiempo de espera agotado" : error.message || "Internal server error";
  res.status(500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`COMEDOR UNCP API listening on http://localhost:${PORT}`);
  console.log("MODE=assisted_manual");
});
