import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(express.json());
app.use(cors());

// =====================
// IN-MEMORY DATABASE (use PostgreSQL in production)
// =====================

const devices = new Map(); // device_id -> { tickets, created_at, last_used }
const registrations = []; // history of all registrations
const config = {
  targetHour: 7,
  targetMinute: 0,
  preFireMs: 800,
  shots: 10,
  intervalMs: 20,
};

// =====================
// AUTHENTICATION MIDDLEWARE
// =====================

const authDevice = (req, res, next) => {
  const deviceId = req.params.deviceId || req.body.device_id;
  if (!deviceId) {
    return res.status(401).json({ error: "device_id required" });
  }
  req.device_id = deviceId;
  next();
};

// =====================
// CLIENT ENDPOINTS
// =====================

// Get available tickets for a device
app.get("/api/device/:deviceId/tickets", authDevice, (req, res) => {
  const deviceId = req.device_id;
  const device = devices.get(deviceId) || { tickets: 0, created_at: Date.now() };
  
  if (!devices.has(deviceId)) {
    devices.set(deviceId, device);
  }

  res.json({ tickets: device.tickets });
});

// Use a ticket (deduct from account)
app.post("/api/device/:deviceId/use-ticket", authDevice, (req, res) => {
  const deviceId = req.device_id;
  const device = devices.get(deviceId);

  if (!device || device.tickets <= 0) {
    return res.status(400).json({ error: "No tickets available" });
  }

  device.tickets -= 1;
  device.last_used = Date.now();
  devices.set(deviceId, device);

  res.json({ tickets_remaining: device.tickets });
});

// Register for comedor
app.post("/api/register", authDevice, (req, res) => {
  const { dni, codigo, shot_number } = req.body;
  const deviceId = req.device_id;

  const registration = {
    id: uuidv4(),
    device_id: deviceId,
    dni,
    codigo,
    shot_number,
    timestamp: new Date().toISOString(),
    status: "pending",
  };

  // Simulate registration with the UNCP system
  // In production, make actual HTTP requests to the comedor endpoint
  registration.status = "success";

  registrations.push(registration);

  // Log for debugging
  console.log(
    `[REGISTER] Device: ${deviceId} | DNI: ${dni} | Shot: ${shot_number} | Time: ${new Date().toLocaleTimeString()}`
  );

  res.json({
    success: true,
    registration_id: registration.id,
    message: "Registrado exitosamente",
  });
});

// Get target time (hour:minute for registration window)
app.get("/api/config/target-time", (req, res) => {
  res.json({
    hour: config.targetHour,
    minute: config.targetMinute,
    preFireMs: config.preFireMs,
    shots: config.shots,
    intervalMs: config.intervalMs,
  });
});

// =====================
// ADMIN ENDPOINTS
// =====================

// Admin authentication (simple token for now)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin-secret-token-change-this";

const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Get all devices
app.get("/admin/devices", adminAuth, (req, res) => {
  const devicesList = Array.from(devices.entries()).map(([id, data]) => ({
    id,
    tickets: data.tickets,
    created_at: data.created_at,
    last_used: data.last_used || null,
  }));
  res.json(devicesList);
});

// Get device details
app.get("/admin/devices/:deviceId", adminAuth, (req, res) => {
  const device = devices.get(req.params.deviceId);
  if (!device) {
    return res.status(404).json({ error: "Device not found" });
  }

  const deviceRegs = registrations.filter(
    (r) => r.device_id === req.params.deviceId
  );

  res.json({
    id: req.params.deviceId,
    tickets: device.tickets,
    registrations_count: deviceRegs.length,
    registrations: deviceRegs,
    created_at: device.created_at,
    last_used: device.last_used,
  });
});

// Add tickets to device
app.post("/admin/devices/:deviceId/add-tickets", adminAuth, (req, res) => {
  const { amount } = req.body;
  const deviceId = req.params.deviceId;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  let device = devices.get(deviceId) || { tickets: 0, created_at: Date.now() };
  device.tickets += amount;
  devices.set(deviceId, device);

  console.log(
    `[ADMIN] Added ${amount} tickets to ${deviceId}. Total: ${device.tickets}`
  );

  res.json({
    device_id: deviceId,
    tickets_added: amount,
    tickets_total: device.tickets,
  });
});

// Subtract tickets from device
app.post("/admin/devices/:deviceId/subtract-tickets", adminAuth, (req, res) => {
  const { amount } = req.body;
  const deviceId = req.params.deviceId;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  let device = devices.get(deviceId);
  if (!device) {
    return res.status(404).json({ error: "Device not found" });
  }

  device.tickets = Math.max(0, device.tickets - amount);
  devices.set(deviceId, device);

  console.log(
    `[ADMIN] Subtracted ${amount} from ${deviceId}. Total: ${device.tickets}`
  );

  res.json({
    device_id: deviceId,
    tickets_subtracted: amount,
    tickets_remaining: device.tickets,
  });
});

// Set tickets to exact amount
app.post("/admin/devices/:deviceId/set-tickets", adminAuth, (req, res) => {
  const { amount } = req.body;
  const deviceId = req.params.deviceId;

  if (amount === undefined || amount < 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  let device = devices.get(deviceId) || { tickets: 0, created_at: Date.now() };
  const oldAmount = device.tickets;
  device.tickets = amount;
  devices.set(deviceId, device);

  console.log(
    `[ADMIN] Set ${deviceId} tickets: ${oldAmount} -> ${amount}`
  );

  res.json({
    device_id: deviceId,
    previous_amount: oldAmount,
    new_amount: amount,
  });
});

// Get all registrations
app.get("/admin/registrations", adminAuth, (req, res) => {
  const filtered = registrations.map((r) => ({
    ...r,
    device: devices.get(r.device_id),
  }));
  res.json({
    total: filtered.length,
    registrations: filtered.slice(-100), // Last 100
  });
});

// Get stats
app.get("/admin/stats", adminAuth, (req, res) => {
  const totalDevices = devices.size;
  const totalTickets = Array.from(devices.values()).reduce(
    (sum, d) => sum + d.tickets,
    0
  );
  const totalRegistrations = registrations.length;
  const todayRegistrations = registrations.filter((r) => {
    const regDate = new Date(r.timestamp);
    const today = new Date();
    return (
      regDate.toDateString() === today.toDateString()
    );
  }).length;

  res.json({
    total_devices: totalDevices,
    total_tickets_in_system: totalTickets,
    total_registrations: totalRegistrations,
    registrations_today: todayRegistrations,
  });
});

// Update configuration
app.post("/admin/config", adminAuth, (req, res) => {
  const { targetHour, targetMinute, preFireMs, shots, intervalMs } = req.body;

  if (targetHour !== undefined) config.targetHour = targetHour;
  if (targetMinute !== undefined) config.targetMinute = targetMinute;
  if (preFireMs !== undefined) config.preFireMs = preFireMs;
  if (shots !== undefined) config.shots = shots;
  if (intervalMs !== undefined) config.intervalMs = intervalMs;

  console.log(
    `[ADMIN] Config updated: ${config.targetHour}:${String(config.targetMinute).padStart(2, "0")}`
  );

  res.json({ config });
});

// Get current configuration
app.get("/admin/config", adminAuth, (req, res) => {
  res.json({ config });
});

// Delete a device
app.delete("/admin/devices/:deviceId", adminAuth, (req, res) => {
  if (devices.has(req.params.deviceId)) {
    devices.delete(req.params.deviceId);
    console.log(`[ADMIN] Device deleted: ${req.params.deviceId}`);
    res.json({ message: "Device deleted" });
  } else {
    res.status(404).json({ error: "Device not found" });
  }
});

// =====================
// UNCP INTEGRATION ENDPOINT (for actual registration)
// =====================

// This would forward requests to the actual UNCP comedor system
app.post("/api/uncp-register", authDevice, async (req, res) => {
  const { dni, codigo } = req.body;

  // In production, make actual HTTP request to UNCP endpoint:
  // const response = await fetch("https://comedor.uncp.edu.pe/api/registrar", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //   body: `dni=${dni}&codigo=${codigo}`
  // });

  // For now, simulate success
  res.json({
    success: true,
    message: "Registrado en UNCP",
    ticket: Math.random().toString(36).substr(2, 9).toUpperCase(),
  });
});

// =====================
// ERROR HANDLING
// =====================

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// =====================
// START SERVER
// =====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 COMEDOR UNCP API running on port ${PORT}`);
  console.log(`📍 Base URL: http://localhost:${PORT}`);
  console.log(`🔐 Admin Token: ${ADMIN_TOKEN}`);
  console.log(`⏰ Target time: ${config.targetHour}:${String(config.targetMinute).padStart(2, "0")}`);
});
