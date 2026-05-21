import { useState, useEffect, useRef } from "react";
import html2canvas from "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";

const TEAL = "#0D9488";
const DARK = "#0F172A";
const CARD = "#1E293B";
const BORDER = "#334155";

// Configuration - CHANGE THESE FOR YOUR DEPLOYMENT
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000";
const ADMIN_EMAIL = "admin@comedor-uncp.com";
const ADMIN_PASSWORD = "admin123456"; // CHANGE THIS IMMEDIATELY

function getDeviceId() {
  let did = localStorage.getItem("device_id");
  if (!did) {
    did = `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("device_id", did);
  }
  return did;
}

function fmtCountdown(ms) {
  if (ms < 0) ms = 0;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  const msec = ms % 1000;
  return `${String(s).padStart(2, "0")}.${String(msec).padStart(3, "0")}`;
}

export default function UnifiedApp() {
  // Global states
  const [role, setRole] = useState(null); // null | 'client' | 'admin'
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [deviceId, setDeviceId] = useState("");

  // Admin states
  const [adminToken, setAdminToken] = useState("");
  const [adminTab, setAdminTab] = useState("dashboard"); // dashboard | devices | registrations | config | settings
  const [adminPass, setAdminPass] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  // Client states
  const [ticketsAvailable, setTicketsAvailable] = useState(0);
  const [dni, setDni] = useState("");
  const [codigo, setCodigo] = useState("");
  const [countdown, setCountdown] = useState("00:00:00");
  const [status, setStatus] = useState("idle");
  const [targetTime, setTargetTime] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [screen, setScreen] = useState("login"); // login | registro | viviendo | exito
  const [loading, setLoading] = useState(false);

  // Admin data
  const [devices, setDevices] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [searchDevice, setSearchDevice] = useState("");
  const [ticketAction, setTicketAction] = useState("");
  const [ticketAmount, setTicketAmount] = useState("");

  // Refs
  const scheduledRef = useRef(false);
  const firedRef = useRef(false);

  useEffect(() => {
    const did = getDeviceId();
    setDeviceId(did);
  }, []);

  // =====================
  // ADMIN FUNCTIONS
  // =====================

  const handleAdminLogin = () => {
    if (adminEmail === ADMIN_EMAIL && adminPassword === ADMIN_PASSWORD) {
      setAdminToken("admin-session-token-" + Date.now());
      setRole("admin");
      setIsLoggedIn(true);
      loadAdminData();
    } else {
      alert("Credenciales incorrectas");
    }
  };

  const loadAdminData = async () => {
    try {
      const headers = {
        Authorization: `Bearer ${adminToken}`,
      };

      const [devRes, regRes, statsRes, cfgRes] = await Promise.all([
        fetch(`${API_BASE}/admin/devices`, { headers }),
        fetch(`${API_BASE}/admin/registrations`, { headers }),
        fetch(`${API_BASE}/admin/stats`, { headers }),
        fetch(`${API_BASE}/admin/config`, { headers }),
      ]);

      if (devRes.ok) setDevices(await devRes.json());
      if (regRes.ok) {
        const data = await regRes.json();
        setRegistrations(data.registrations || []);
      }
      if (statsRes.ok) setStats(await statsRes.json());
      if (cfgRes.ok) {
        const data = await cfgRes.json();
        setConfig(data.config);
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
    }
  };

  const handleTicketOperation = async () => {
    if (!selectedDevice || !ticketAmount || !ticketAction) return;

    setLoading(true);
    try {
      let endpoint = "";
      if (ticketAction === "add") {
        endpoint = `/admin/devices/${selectedDevice.id}/add-tickets`;
      } else if (ticketAction === "subtract") {
        endpoint = `/admin/devices/${selectedDevice.id}/subtract-tickets`;
      } else if (ticketAction === "set") {
        endpoint = `/admin/devices/${selectedDevice.id}/set-tickets`;
      }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ amount: parseInt(ticketAmount) }),
      });

      if (res.ok) {
        loadAdminData();
        setSelectedDevice(null);
        setTicketAction("");
        setTicketAmount("");
        alert("✅ Operación exitosa");
      } else {
        alert("❌ Error en la operación");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (!window.confirm(`¿Eliminar dispositivo ${deviceId}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/admin/devices/${deviceId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (res.ok) {
        loadAdminData();
        alert("✅ Dispositivo eliminado");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleConfigUpdate = async (key, value) => {
    if (!config) return;

    const newConfig = { ...config, [key]: parseInt(value) };

    try {
      const res = await fetch(`${API_BASE}/admin/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(newConfig),
      });

      if (res.ok) {
        setConfig(newConfig);
        alert("✅ Configuración actualizada");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // =====================
  // CLIENT FUNCTIONS
  // =====================

  const checkTickets = async (did) => {
    try {
      const res = await fetch(`${API_BASE}/api/device/${did}/tickets`);
      const data = await res.json();
      setTicketsAvailable(data.tickets || 0);
    } catch (err) {
      console.error("Error checking tickets:", err);
    }
  };

  const handleClientLogin = () => {
    if (!dni.trim() || !codigo.trim()) {
      alert("Completa DNI y código");
      return;
    }
    setRole("client");
    setIsLoggedIn(true);
    checkTickets(deviceId);
    setScreen("registro");
  };

  const handleStartRegistration = async () => {
    if (ticketsAvailable <= 0) {
      alert("No tienes tickets. Contacta al admin.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/config/target-time`);
      const data = await res.json();
      setTargetTime(data);
      scheduledRef.current = true;
      firedRef.current = false;
      setStatus("waiting");
      setScreen("viviendo");
    } catch (err) {
      alert("Error al conectar");
    } finally {
      setLoading(false);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (screen !== "viviendo" || !targetTime) return;

    const tick = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(targetTime.hour, targetTime.minute, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);

      const diff = target - now;
      setCountdown(fmtCountdown(diff));

      if (
        scheduledRef.current &&
        !firedRef.current &&
        diff <= targetTime.preFireMs &&
        diff >= 0
      ) {
        firedRef.current = true;
        fireShots();
      }
    };

    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [screen, targetTime]);

  const fireShots = async () => {
    setStatus("firing");

    try {
      const promises = [];
      for (let i = 0; i < (targetTime?.shots || 5); i++) {
        setTimeout(() => {
          promises.push(
            fetch(`${API_BASE}/api/register`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                device_id: deviceId,
                dni,
                codigo,
                shot_number: i + 1,
              }),
            })
          );
        }, i * (targetTime?.intervalMs || 20));
      }

      const results = await Promise.all(promises);
      const successful = results.filter((r) => r.ok).length;

      if (successful > 0) {
        setStatus("success");
        const elapsedMs = Date.now();

        await fetch(`${API_BASE}/api/device/${deviceId}/use-ticket`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        await checkTickets(deviceId);

        setSuccessData({
          timestamp: new Date().toLocaleString("es-PE"),
          elapsedMs,
          dni,
          codigo,
        });

        setScreen("exito");
      } else {
        setStatus("error");
      }
    } catch (err) {
      console.error("Fire error:", err);
      setStatus("error");
    }

    scheduledRef.current = false;
  };

  const captureTicket = async () => {
    const element = document.getElementById("ticket-capture");
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: "#0F172A",
        scale: 2,
      });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `ticket-${Date.now()}.png`;
      link.click();
    } catch (err) {
      alert("Error al capturar");
    }
  };

  const inp = {
    width: "100%",
    padding: "11px 12px",
    background: "#0F172A",
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    color: "#F1F5F9",
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  };

  const sel = { ...inp, cursor: "pointer" };

  // =====================
  // RENDER: Initial screen (seleccionar rol)
  // =====================

  if (!isLoggedIn) {
    return (
      <div
        style={{
          fontFamily: "'System', -apple-system, BlinkMacSystemFont, sans-serif",
          background: DARK,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          color: "#CBD5E1",
        }}
      >
        <div style={{ width: "100%", maxWidth: 360 }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div
              style={{
                width: 70,
                height: 70,
                background: TEAL,
                borderRadius: "50%",
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
              }}
            >
              🍽️
            </div>
            <h1
              style={{
                margin: "0 0 4px",
                fontSize: 24,
                fontWeight: 800,
                color: "#F1F5F9",
              }}
            >
              Comedor UNCP
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748B" }}>
              Sistema de Registros v2.0
            </p>
          </div>

          {/* Role selection */}
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => {
                setRole("client");
              }}
              style={{
                width: "100%",
                padding: "16px",
                background: TEAL,
                border: "none",
                borderRadius: 12,
                color: "white",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                marginBottom: 12,
                fontFamily: "inherit",
              }}
            >
              👨‍🎓 Soy Estudiante
            </button>

            <button
              onClick={() => {
                setRole("admin");
              }}
              style={{
                width: "100%",
                padding: "16px",
                background: "#1E40AF",
                border: "none",
                borderRadius: 12,
                color: "white",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              🔑 Soy Administrador
            </button>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 10,
              color: "#475569",
              textAlign: "center",
            }}
          >
            Device ID: {deviceId.substring(0, 20)}...
          </p>
        </div>
      </div>
    );
  }

  // =====================
  // CLIENT INTERFACE
  // =====================

  if (role === "client") {
    // Login
    if (screen === "login") {
      return (
        <div
          style={{
            fontFamily: "'System', -apple-system, BlinkMacSystemFont, sans-serif",
            background: DARK,
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            color: "#CBD5E1",
          }}
        >
          <div style={{ width: "100%", maxWidth: 340 }}>
            <div
              style={{
                width: 60,
                height: 60,
                background: TEAL,
                borderRadius: "50%",
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              🍽️
            </div>
            <h2
              style={{
                margin: "0 0 4px",
                fontSize: 20,
                fontWeight: 700,
                color: "#F1F5F9",
                textAlign: "center",
              }}
            >
              Ingresa tus datos
            </h2>

            <div
              style={{
                background: CARD,
                borderRadius: 16,
                padding: 24,
                border: `1px solid ${BORDER}`,
                marginTop: 20,
              }}
            >
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    fontSize: 11,
                    color: "#94A3B8",
                    display: "block",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  DNI
                </label>
                <input
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="72345678"
                  style={inp}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    fontSize: 11,
                    color: "#94A3B8",
                    display: "block",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Código Universitario
                </label>
                <input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="2021100001"
                  style={inp}
                />
              </div>

              <div
                style={{
                  background: "#0F172A",
                  borderRadius: 12,
                  padding: "12px",
                  marginBottom: 16,
                  border: `1px solid ${BORDER}`,
                  textAlign: "center",
                }}
              >
                <p style={{ margin: 0, fontSize: 11, color: "#64748B" }}>
                  Tickets disponibles
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 24,
                    fontWeight: 800,
                    color: ticketsAvailable > 0 ? TEAL : "#EF4444",
                  }}
                >
                  {ticketsAvailable}
                </p>
              </div>
            </div>

            <button
              onClick={handleClientLogin}
              disabled={!dni.trim() || !codigo.trim()}
              style={{
                width: "100%",
                padding: "13px",
                background:
                  !dni.trim() || !codigo.trim() ? "#475569" : TEAL,
                border: "none",
                borderRadius: 12,
                color: "white",
                fontWeight: 700,
                fontSize: 14,
                cursor:
                  !dni.trim() || !codigo.trim() ? "default" : "pointer",
                marginTop: 16,
                fontFamily: "inherit",
              }}
            >
              Continuar
            </button>

            <button
              onClick={() => setIsLoggedIn(false)}
              style={{
                width: "100%",
                padding: "10px",
                background: "transparent",
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                color: "#64748B",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                marginTop: 10,
                fontFamily: "inherit",
              }}
            >
              Atrás
            </button>
          </div>
        </div>
      );
    }

    // Registro
    if (screen === "registro") {
      return (
        <div
          style={{
            fontFamily: "'System', -apple-system, BlinkMacSystemFont, sans-serif",
            background: DARK,
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            color: "#CBD5E1",
          }}
        >
          <div style={{ width: "100%", maxWidth: 320, textAlign: "center" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700 }}>
              Confirmar Registro
            </h2>
            <p style={{ margin: "0 0 28px", fontSize: 13, color: "#64748B" }}>
              DNI: <strong style={{ color: "#E2E8F0" }}>{dni}</strong>
            </p>

            <div
              style={{
                background: CARD,
                borderRadius: 14,
                padding: 20,
                marginBottom: 24,
                border: `1px solid ${BORDER}`,
              }}
            >
              <p style={{ margin: 0, fontSize: 11, color: "#64748B" }}>
                COSTO
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 32,
                  fontWeight: 800,
                  color: TEAL,
                }}
              >
                1 Ticket
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "#475569" }}>
                Te quedará:{" "}
                <strong style={{ color: "#E2E8F0" }}>
                  {ticketsAvailable - 1}
                </strong>
              </p>
            </div>

            <button
              onClick={handleStartRegistration}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                background: TEAL,
                border: "none",
                borderRadius: 10,
                color: "white",
                fontWeight: 700,
                fontSize: 14,
                cursor: loading ? "wait" : "pointer",
                marginBottom: 10,
                fontFamily: "inherit",
              }}
            >
              {loading ? "Conectando..." : "Aceptar"}
            </button>

            <button
              onClick={() => setScreen("login")}
              style={{
                width: "100%",
                padding: "12px",
                background: "transparent",
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                color: "#64748B",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      );
    }

    // Viviendo
    if (screen === "viviendo") {
      return (
        <div
          style={{
            fontFamily: "'System', -apple-system, BlinkMacSystemFont, sans-serif",
            background: DARK,
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div style={{ width: "100%", maxWidth: 320, textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                background:
                  status === "firing"
                    ? "#F87171"
                    : status === "success"
                    ? "#34D399"
                    : "#FBBF24",
                color: "white",
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 11,
                fontWeight: 700,
                marginBottom: 24,
                textTransform: "uppercase",
              }}
            >
              {status === "firing" && "🔥 Disparando"}
              {status === "waiting" && "⏳ Esperando"}
            </div>

            <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748B" }}>
              Contador
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 52,
                fontWeight: 800,
                fontFamily: "monospace",
                color: TEAL,
              }}
            >
              {countdown}
            </p>

            {status === "waiting" && (
              <button
                onClick={() => {
                  scheduledRef.current = false;
                  setScreen("registro");
                  setStatus("idle");
                }}
                style={{
                  marginTop: 24,
                  padding: "12px 20px",
                  background: "#475569",
                  border: "none",
                  borderRadius: 10,
                  color: "white",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      );
    }

    // Éxito
    if (screen === "exito" && successData) {
      return (
        <div
          style={{
            fontFamily: "'System', -apple-system, BlinkMacSystemFont, sans-serif",
            background: DARK,
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div style={{ width: "100%", maxWidth: 340 }}>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h1
                style={{
                  margin: "0 0 4px",
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#34D399",
                }}
              >
                ¡Registrado!
              </h1>
            </div>

            <div
              id="ticket-capture"
              style={{
                background: CARD,
                borderRadius: 16,
                padding: 20,
                border: `2px solid ${TEAL}`,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  marginBottom: 16,
                  paddingBottom: 16,
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                <p style={{ margin: "0 0 8px", fontSize: 11, color: "#64748B" }}>
                  Ticket
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 800,
                    color: TEAL,
                    fontFamily: "monospace",
                  }}
                >
                  {Date.now().toString(36).toUpperCase()}
                </p>
              </div>

              <div style={{ fontSize: 12, color: "#E2E8F0" }}>
                <p style={{ margin: "0 0 8px" }}>DNI: {successData.dni}</p>
                <p style={{ margin: "0 0 8px" }}>Código: {successData.codigo}</p>
                <p style={{ margin: 0 }}>{successData.timestamp}</p>
              </div>
            </div>

            <button
              onClick={captureTicket}
              style={{
                width: "100%",
                padding: "12px",
                background: TEAL,
                border: "none",
                borderRadius: 10,
                color: "white",
                fontWeight: 700,
                marginBottom: 10,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              📸 Descargar
            </button>

            <button
              onClick={() => {
                setScreen("login");
                setDni("");
                setCodigo("");
                setSuccessData(null);
                checkTickets(deviceId);
              }}
              style={{
                width: "100%",
                padding: "12px",
                background: "transparent",
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                color: "#64748B",
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              Nuevo Registro
            </button>
          </div>
        </div>
      );
    }
  }

  // =====================
  // ADMIN INTERFACE
  // =====================

  if (role === "admin" && !isLoggedIn) {
    return (
      <div
        style={{
          fontFamily: "'System', -apple-system, BlinkMacSystemFont, sans-serif",
          background: DARK,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div style={{ width: "100%", maxWidth: 360 }}>
          <h1
            style={{
              margin: "0 0 24px",
              fontSize: 22,
              fontWeight: 800,
              color: "#F1F5F9",
              textAlign: "center",
            }}
          >
            🔐 Panel Admin
          </h1>

          <div
            style={{
              background: CARD,
              borderRadius: 16,
              padding: 24,
              border: `1px solid ${BORDER}`,
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 11,
                  color: "#94A3B8",
                  display: "block",
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                Email
              </label>
              <input
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@comedor-uncp.com"
                style={inp}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  fontSize: 11,
                  color: "#94A3B8",
                  display: "block",
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                Contraseña
              </label>
              <input
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(adminPassword)}
                placeholder="••••••••"
                style={inp}
              />
            </div>

            <button
              onClick={handleAdminLogin}
              style={{
                width: "100%",
                padding: "12px",
                background: "#1E40AF",
                border: "none",
                borderRadius: 10,
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                marginBottom: 10,
              }}
            >
              Ingresar
            </button>

            <button
              onClick={() => setIsLoggedIn(false)}
              style={{
                width: "100%",
                padding: "10px",
                background: "transparent",
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                color: "#64748B",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Atrás
            </button>
          </div>

          <p
            style={{
              margin: "20px 0 0",
              fontSize: 10,
              color: "#475569",
              textAlign: "center",
            }}
          >
            Email: {ADMIN_EMAIL}
            <br />
            Password: (default setup)
          </p>
        </div>
      </div>
    );
  }

  if (role === "admin" && isLoggedIn) {
    const filteredDevices = devices.filter((d) =>
      d.id.toLowerCase().includes(searchDevice.toLowerCase())
    );

    return (
      <div
        style={{
          fontFamily: "'System', -apple-system, BlinkMacSystemFont, sans-serif",
          background: DARK,
          minHeight: "100vh",
          color: "#CBD5E1",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "#1E40AF",
            padding: "16px 20px",
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              color: "white",
            }}
          >
            🔑 Admin Panel
          </h1>
          <button
            onClick={() => {
              setIsLoggedIn(false);
              setRole(null);
              setAdminEmail("");
              setAdminPass("");
            }}
            style={{
              padding: "6px 12px",
              background: "#EF4444",
              border: "none",
              borderRadius: 6,
              color: "white",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Salir
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            background: "#1E293B",
            borderBottom: `1px solid ${BORDER}`,
            overflowX: "auto",
          }}
        >
          {[
            ["dashboard", "📊 Dashboard"],
            ["devices", "📱 Devices"],
            ["registrations", "📋 Registros"],
            ["config", "⚙️ Config"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setAdminTab(id)}
              style={{
                padding: "12px 18px",
                border: "none",
                background: "transparent",
                color: adminTab === id ? "#1E40AF" : "#64748B",
                fontSize: 12,
                fontWeight: adminTab === id ? 700 : 400,
                cursor: "pointer",
                borderBottom:
                  adminTab === id ? "2px solid #1E40AF" : "2px solid transparent",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: 20 }}>
          {/* Dashboard */}
          {adminTab === "dashboard" && stats && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 12,
              }}
            >
              {[
                {
                  label: "Devices",
                  value: stats.total_devices,
                  icon: "📱",
                },
                {
                  label: "Tickets",
                  value: stats.total_tickets_in_system,
                  icon: "🎫",
                },
                {
                  label: "Registros",
                  value: stats.total_registrations,
                  icon: "📋",
                },
                {
                  label: "Hoy",
                  value: stats.registrations_today,
                  icon: "📊",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: CARD,
                    borderRadius: 12,
                    padding: 16,
                    border: `1px solid ${BORDER}`,
                    textAlign: "center",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 24, marginBottom: 8 }}>
                    {stat.icon}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      color: "#64748B",
                      marginBottom: 4,
                    }}
                  >
                    {stat.label}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 800,
                      color: "#1E40AF",
                    }}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Devices */}
          {adminTab === "devices" && (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <input
                  type="text"
                  placeholder="Buscar device ID..."
                  value={searchDevice}
                  onChange={(e) => setSearchDevice(e.target.value)}
                  style={{
                    ...inp,
                    flex: 1,
                  }}
                />
                <button
                  onClick={loadAdminData}
                  style={{
                    padding: "11px 16px",
                    background: "#1E40AF",
                    border: "none",
                    borderRadius: 8,
                    color: "white",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  🔄
                </button>
              </div>

              {selectedDevice && (
                <div
                  style={{
                    background: CARD,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                    border: `2px solid #1E40AF`,
                  }}
                >
                  <h3 style={{ margin: "0 0 12px", color: "#1E40AF" }}>
                    {selectedDevice.id}
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    {["add", "subtract", "set"].map((action) => (
                      <button
                        key={action}
                        onClick={() => setTicketAction(action)}
                        style={{
                          padding: "8px",
                          background:
                            ticketAction === action
                              ? "#1E40AF"
                              : "transparent",
                          border: `1px solid ${
                            ticketAction === action ? "#1E40AF" : BORDER
                          }`,
                          color:
                            ticketAction === action ? "white" : "#64748B",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: 11,
                          fontFamily: "inherit",
                        }}
                      >
                        {action === "add" && "➕ Agregar"}
                        {action === "subtract" && "➖ Restar"}
                        {action === "set" && "🎯 Establecer"}
                      </button>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <input
                      type="number"
                      min="0"
                      value={ticketAmount}
                      onChange={(e) => setTicketAmount(e.target.value)}
                      placeholder="Cantidad"
                      style={{ ...inp, flex: 1 }}
                    />
                    <button
                      onClick={handleTicketOperation}
                      disabled={loading || !ticketAction || !ticketAmount}
                      style={{
                        padding: "11px 16px",
                        background: loading ? "#475569" : "#1E40AF",
                        border: "none",
                        borderRadius: 8,
                        color: "white",
                        fontWeight: 700,
                        cursor: loading ? "wait" : "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDevice(null);
                        setTicketAction("");
                        setTicketAmount("");
                      }}
                      style={{
                        padding: "11px 16px",
                        background: "#475569",
                        border: "none",
                        borderRadius: 8,
                        color: "#CBD5E1",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: CARD,
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      <th style={{ padding: "10px", textAlign: "left" }}>
                        Device ID
                      </th>
                      <th style={{ padding: "10px", textAlign: "center" }}>
                        🎫
                      </th>
                      <th style={{ padding: "10px", textAlign: "center" }}>
                        Creado
                      </th>
                      <th style={{ padding: "10px", textAlign: "center" }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDevices.map((device) => (
                      <tr
                        key={device.id}
                        style={{ borderBottom: `1px solid ${BORDER}` }}
                      >
                        <td
                          style={{
                            padding: "10px",
                            fontFamily: "monospace",
                            fontSize: 10,
                          }}
                        >
                          {device.id.substring(0, 20)}...
                        </td>
                        <td
                          style={{
                            padding: "10px",
                            textAlign: "center",
                            color: device.tickets > 0 ? "#1E40AF" : "#EF4444",
                            fontWeight: 700,
                          }}
                        >
                          {device.tickets}
                        </td>
                        <td
                          style={{
                            padding: "10px",
                            textAlign: "center",
                            fontSize: 10,
                          }}
                        >
                          {new Date(device.created_at).toLocaleDateString("es-PE")}
                        </td>
                        <td
                          style={{
                            padding: "10px",
                            textAlign: "center",
                          }}
                        >
                          <button
                            onClick={() => setSelectedDevice(device)}
                            style={{
                              padding: "4px 8px",
                              background: "#1E40AF",
                              border: "none",
                              borderRadius: 4,
                              color: "white",
                              fontSize: 10,
                              cursor: "pointer",
                              marginRight: 4,
                              fontFamily: "inherit",
                            }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteDevice(device.id)}
                            style={{
                              padding: "4px 8px",
                              background: "#EF4444",
                              border: "none",
                              borderRadius: 4,
                              color: "white",
                              fontSize: 10,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            Del
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Registrations */}
          {adminTab === "registrations" && (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 10,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: CARD,
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    <th style={{ padding: "8px", textAlign: "left" }}>
                      Timestamp
                    </th>
                    <th style={{ padding: "8px", textAlign: "left" }}>DNI</th>
                    <th style={{ padding: "8px", textAlign: "center" }}>
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.slice(-50).reverse().map((reg) => (
                    <tr
                      key={reg.id}
                      style={{ borderBottom: `1px solid ${BORDER}` }}
                    >
                      <td style={{ padding: "8px" }}>
                        {new Date(reg.timestamp).toLocaleString("es-PE")}
                      </td>
                      <td style={{ padding: "8px" }}>{reg.dni}</td>
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            padding: "2px 6px",
                            background: "#065F46",
                            color: "#34D399",
                            borderRadius: 4,
                            fontSize: 9,
                          }}
                        >
                          {reg.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Config */}
          {adminTab === "config" && config && (
            <div style={{ maxWidth: 500 }}>
              <div
                style={{
                  background: CARD,
                  borderRadius: 12,
                  padding: 16,
                  border: `1px solid ${BORDER}`,
                }}
              >
                {[
                  { key: "targetHour", label: "Hora", min: 0, max: 23 },
                  {
                    key: "targetMinute",
                    label: "Minuto",
                    min: 0,
                    max: 59,
                  },
                  {
                    key: "preFireMs",
                    label: "Pre-disparo (ms)",
                    min: 0,
                    max: 5000,
                  },
                  {
                    key: "shots",
                    label: "Disparos",
                    min: 1,
                    max: 50,
                  },
                  {
                    key: "intervalMs",
                    label: "Intervalo (ms)",
                    min: 0,
                    max: 1000,
                  },
                ].map(({ key, label, min, max }) => (
                  <div key={key} style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <label style={{ fontSize: 12, fontWeight: 600 }}>
                        {label}
                      </label>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>
                        {config[key]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      value={config[key]}
                      onChange={(e) =>
                        handleConfigUpdate(key, e.target.value)
                      }
                      style={{
                        width: "100%",
                        accentColor: "#1E40AF",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
