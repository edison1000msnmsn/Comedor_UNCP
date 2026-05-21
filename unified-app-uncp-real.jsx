import { useState, useEffect, useRef } from "react";
import html2canvas from "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";

const TEAL = "#0D9488";
const DARK = "#0F172A";
const CARD = "#1E293B";
const BORDER = "#334155";

// =====================
// CONFIGURACIÓN DE ENDPOINTS
// =====================

// Backend propio (para gestión de tickets)
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000";

// Endpoint REAL del Comedor UNCP
const UNCP_ENDPOINT = "https://comedor.uncp.edu.pe/charola";

// Admin credentials
const ADMIN_EMAIL = "admin@comedor-uncp.com";
const ADMIN_PASSWORD = "admin123456";

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

export default function UnifiedApp() {
  // Global
  const [role, setRole] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [deviceId, setDeviceId] = useState("");

  // Admin
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [adminTab, setAdminTab] = useState("dashboard");
  const [devices, setDevices] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [searchDevice, setSearchDevice] = useState("");
  const [ticketAction, setTicketAction] = useState("");
  const [ticketAmount, setTicketAmount] = useState("");

  // Client
  const [ticketsAvailable, setTicketsAvailable] = useState(0);
  const [dni, setDni] = useState("");
  const [codigo, setCodigo] = useState("");
  const [countdown, setCountdown] = useState("00:00:00");
  const [status, setStatus] = useState("idle");
  const [targetTime, setTargetTime] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [screen, setScreen] = useState("login");
  const [loading, setLoading] = useState(false);

  // Integración UNCP
  const [uncpResponse, setUncpResponse] = useState(null);
  const [uncpError, setUncpError] = useState(null);
  const [shotLogs, setShotLogs] = useState([]);

  const scheduledRef = useRef(false);
  const firedRef = useRef(false);

  useEffect(() => {
    const did = getDeviceId();
    setDeviceId(did);
  }, []);

  // =====================
  // FUNCIONES DE INTEGRACIÓN UNCP
  // =====================

  /**
   * Función para enviar datos al endpoint real de UNCP
   * POST a https://comedor.uncp.edu.pe/charola
   */
  const sendToUNCP = async (dniValue, codigoValue, shotNumber) => {
    const timestamp = new Date().toLocaleTimeString("es-PE");

    try {
      // Log del disparo
      setShotLogs((prev) => [
        ...prev,
        {
          shot: shotNumber,
          time: timestamp,
          status: "enviando...",
          dni: dniValue,
        },
      ]);

      // Datos que enviar a UNCP (adaptar según su formulario real)
      const formData = new FormData();
      formData.append("dni", dniValue);
      formData.append("codigo", codigoValue);
      formData.append("timestamp", new Date().toISOString());

      // O si usa JSON:
      const payload = {
        dni: dniValue,
        codigo: codigoValue,
        timestamp: new Date().toISOString(),
      };

      // Intento 1: POST con JSON
      let response = await fetch(UNCP_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).catch((err) => {
        // Si falla CORS, intentar FormData
        return fetch(UNCP_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `dni=${dniValue}&codigo=${codigoValue}`,
        });
      });

      const responseText = await response.text();

      setShotLogs((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].status = response.ok
          ? `✅ HTTP ${response.status}`
          : `❌ HTTP ${response.status}`;
        updated[updated.length - 1].response = responseText.substring(0, 100);
        return updated;
      });

      setUncpResponse({
        status: response.status,
        ok: response.ok,
        timestamp,
        body: responseText.substring(0, 200),
      });

      return response.ok;
    } catch (err) {
      setShotLogs((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].status = `❌ ${err.message}`;
        return updated;
      });

      setUncpError(err.message);
      return false;
    }
  };

  /**
   * Disparador automático mejorado
   * Envía múltiples requests al endpoint real de UNCP
   */
  const fireShots = async () => {
    setStatus("firing");
    setShotLogs([]);
    let successCount = 0;

    try {
      for (let i = 0; i < (targetTime?.shots || 10); i++) {
        const success = await sendToUNCP(dni, codigo, i + 1);
        if (success) successCount++;

        // Esperar intervalo entre disparos
        if (i < (targetTime?.shots || 10) - 1) {
          await new Promise((r) =>
            setTimeout(r, targetTime?.intervalMs || 20)
          );
        }
      }

      if (successCount > 0) {
        setStatus("success");

        // Deducir ticket de nuestro sistema
        await fetch(`${API_BASE}/api/device/${deviceId}/use-ticket`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        // Recargar tickets
        checkTickets(deviceId);

        setSuccessData({
          timestamp: new Date().toLocaleString("es-PE"),
          shotsFired: targetTime?.shots || 10,
          shotsSuccess: successCount,
          dni,
          codigo,
        });

        setScreen("exito");
      } else {
        setStatus("error");
        setUncpError("Todos los intentos fallaron");
      }
    } catch (err) {
      setStatus("error");
      setUncpError(err.message);
    }

    scheduledRef.current = false;
  };

  /**
   * Auto-fill: obtener datos del DNI si están disponibles
   * Simular lectura de documento
   */
  const autoFillFromDNI = async (dniValue) => {
    // En una versión real, podrías:
    // 1. Integrar con API de RENIEC
    // 2. Leer código de barras
    // 3. Usar datos almacenados

    // Por ahora, simulamos:
    console.log("Auto-fill para DNI:", dniValue);

    // Podrías hacer validación:
    if (!/^\d{8}$/.test(dniValue)) {
      alert("DNI inválido (debe ser 8 dígitos)");
      return;
    }
  };

  // =====================
  // FUNCIONES ADMIN
  // =====================

  const handleAdminLogin = () => {
    if (adminEmail === ADMIN_EMAIL && adminPass === ADMIN_PASSWORD) {
      setAdminToken("admin-session-token-" + Date.now());
      setRole("admin");
      setIsLoggedIn(true);
      loadAdminData();
    } else {
      alert("❌ Credenciales incorrectas");
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
      }
    } catch (err) {
      alert("❌ Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================
  // FUNCIONES CLIENTE
  // =====================

  const checkTickets = async (did) => {
    try {
      const res = await fetch(`${API_BASE}/api/device/${did}/tickets`);
      const data = await res.json();
      setTicketsAvailable(data.tickets || 0);
    } catch (err) {
      console.error("Error:", err);
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
      alert("❌ No tienes tickets");
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
      alert("❌ Error conectando");
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
      alert("❌ Error al capturar");
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

  // =====================
  // RENDER: Screen inicial
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
        }}
      >
        <div style={{ width: "100%", maxWidth: 360 }}>
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
              Sistema Avanzado v2.1
            </p>
          </div>

          <button
            onClick={() => setRole("client")}
            style={{
              width: "100%",
              padding: "16px",
              background: TEAL,
              border: "none",
              borderRadius: 12,
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 12,
              fontFamily: "inherit",
            }}
          >
            👨‍🎓 Soy Estudiante
          </button>

          <button
            onClick={() => setRole("admin")}
            style={{
              width: "100%",
              padding: "16px",
              background: "#1E40AF",
              border: "none",
              borderRadius: 12,
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            🔑 Soy Administrador
          </button>

          <p
            style={{
              margin: "20px 0 0",
              fontSize: 10,
              color: "#475569",
              textAlign: "center",
            }}
          >
            Device ID: {deviceId.substring(0, 20)}...
            <br />
            Endpoint UNCP: {UNCP_ENDPOINT}
          </p>
        </div>
      </div>
    );
  }

  // =====================
  // CLIENTE: LOGIN
  // =====================

  if (role === "client" && screen === "login") {
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
          <h2
            style={{
              margin: "0 0 24px",
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
            }}
          >
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: "#94A3B8" }}>DNI</label>
              <input
                value={dni}
                onChange={(e) => {
                  setDni(e.target.value);
                  autoFillFromDNI(e.target.value);
                }}
                placeholder="72345678"
                maxLength="8"
                style={inp}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: "#94A3B8" }}>
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

  // =====================
  // CLIENTE: REGISTRO
  // =====================

  if (role === "client" && screen === "registro") {
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
          <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700 }}>
            Confirmar Registro
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748B" }}>
            Se enviará a: <code style={{ color: TEAL }}>{UNCP_ENDPOINT}</code>
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
            <p style={{ margin: 0, fontSize: 11, color: "#64748B" }}>DATOS</p>
            <p style={{ margin: "8px 0", fontSize: 12, color: "#E2E8F0" }}>
              DNI: <strong>{dni}</strong>
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#E2E8F0" }}>
              Código: <strong>{codigo}</strong>
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
              cursor: loading ? "wait" : "pointer",
              marginBottom: 10,
              fontFamily: "inherit",
            }}
          >
            {loading ? "Conectando..." : "✓ Aceptar"}
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
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ✕ Cancelar
          </button>
        </div>
      </div>
    );
  }

  // =====================
  // CLIENTE: EN VIVO
  // =====================

  if (role === "client" && screen === "viviendo") {
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
          <div
            style={{
              display: "inline-block",
              width: "100%",
              background:
                status === "firing"
                  ? "#F87171"
                  : status === "success"
                  ? "#34D399"
                  : "#FBBF24",
              color: "white",
              borderRadius: 12,
              padding: "10px",
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 20,
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {status === "firing" && "🔥 Disparando contra UNCP"}
            {status === "waiting" && "⏳ Esperando hora objetivo"}
            {status === "success" && "✅ ¡Registrado exitosamente!"}
            {status === "error" && "❌ Error en el registro"}
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
              textAlign: "center",
            }}
          >
            {countdown}
          </p>

          {status === "firing" && shotLogs.length > 0 && (
            <div
              style={{
                background: CARD,
                borderRadius: 10,
                padding: 12,
                marginTop: 16,
                border: `1px solid ${BORDER}`,
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              <p style={{ margin: "0 0 8px", fontSize: 10, color: "#64748B" }}>
                Disparos en tiempo real:
              </p>
              {shotLogs.map((log, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 9,
                    color: "#94A3B8",
                    marginBottom: 4,
                    fontFamily: "monospace",
                  }}
                >
                  Shot {log.shot}: {log.status}
                </div>
              ))}
            </div>
          )}

          {status === "waiting" && (
            <button
              onClick={() => {
                scheduledRef.current = false;
                setScreen("registro");
                setStatus("idle");
              }}
              style={{
                width: "100%",
                padding: "12px",
                background: "#475569",
                border: "none",
                borderRadius: 10,
                color: "white",
                cursor: "pointer",
                marginTop: 24,
                fontFamily: "inherit",
              }}
            >
              Cancelar
            </button>
          )}

          {uncpError && (
            <div
              style={{
                background: "#7F1D1D",
                borderRadius: 10,
                padding: 10,
                marginTop: 12,
                color: "#FCA5A5",
                fontSize: 10,
              }}
            >
              Error UNCP: {uncpError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =====================
  // CLIENTE: ÉXITO
  // =====================

  if (role === "client" && screen === "exito" && successData) {
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
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h1
              style={{
                margin: "0 0 8px",
                fontSize: 22,
                fontWeight: 800,
                color: "#34D399",
              }}
            >
              ¡Registrado en UNCP!
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: "#64748B",
              }}
            >
              {successData.shotsSuccess} de {successData.shotsFired} disparos
              exitosos
            </p>
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
                marginBottom: 14,
                paddingBottom: 14,
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              <p style={{ margin: "0 0 6px", fontSize: 10, color: "#64748B" }}>
                Ticket COMEDOR UNCP
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

            <div style={{ fontSize: 11, color: "#E2E8F0", lineHeight: 1.8 }}>
              <p style={{ margin: "0 0 6px" }}>DNI: {successData.dni}</p>
              <p style={{ margin: "0 0 6px" }}>Código: {successData.codigo}</p>
              <p style={{ margin: "0 0 6px" }}>Hora: {successData.timestamp}</p>
              <p style={{ margin: 0 }}>
                Endpoint:{" "}
                <code style={{ fontSize: 9, color: TEAL }}>
                  {UNCP_ENDPOINT.substring(0, 30)}...
                </code>
              </p>
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
            📸 Descargar Ticket
          </button>

          <button
            onClick={() => {
              setScreen("login");
              setDni("");
              setCodigo("");
              setSuccessData(null);
              setShotLogs([]);
              setUncpError(null);
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

          {uncpResponse && (
            <div
              style={{
                background: "#065F46",
                borderRadius: 10,
                padding: 10,
                marginTop: 12,
                fontSize: 9,
                color: "#34D399",
                fontFamily: "monospace",
              }}
            >
              <strong>Respuesta UNCP HTTP {uncpResponse.status}:</strong>
              <pre
                style={{
                  margin: "4px 0 0",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {uncpResponse.body}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =====================
  // ADMIN: LOGIN
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
              <label style={{ fontSize: 11, color: "#94A3B8" }}>Email</label>
              <input
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@comedor-uncp.com"
                style={{
                  ...inp,
                  marginBottom: 0,
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: "#94A3B8" }}>
                Contraseña
              </label>
              <input
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                placeholder="••••••••"
                style={{
                  ...inp,
                  marginBottom: 0,
                }}
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
        </div>
      </div>
    );
  }

  // =====================
  // ADMIN: DASHBOARD
  // =====================

  if (role === "admin" && isLoggedIn) {
    return (
      <div
        style={{
          fontFamily: "'System', -apple-system, BlinkMacSystemFont, sans-serif",
          background: DARK,
          minHeight: "100vh",
          color: "#CBD5E1",
        }}
      >
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
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "white" }}>
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
          {adminTab === "dashboard" && stats && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 12,
              }}
            >
              {[
                { label: "Devices", value: stats.total_devices, icon: "📱" },
                { label: "Tickets", value: stats.total_tickets_in_system, icon: "🎫" },
                { label: "Registros", value: stats.total_registrations, icon: "📋" },
                { label: "Hoy", value: stats.registrations_today, icon: "📊" },
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
                  <p style={{ margin: 0, fontSize: 10, color: "#64748B", marginBottom: 4 }}>
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

          {adminTab === "devices" && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="Buscar device..."
                  value={searchDevice}
                  onChange={(e) => setSearchDevice(e.target.value)}
                  style={inp}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                }}
              >
                {devices
                  .filter((d) =>
                    d.id.toLowerCase().includes(searchDevice.toLowerCase())
                  )
                  .slice(0, 10)
                  .map((device) => (
                    <div
                      key={device.id}
                      style={{
                        background: CARD,
                        borderRadius: 10,
                        padding: 12,
                        border: `1px solid ${BORDER}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <code
                          style={{
                            fontSize: 9,
                            color: "#94A3B8",
                          }}
                        >
                          {device.id.substring(0, 25)}...
                        </code>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: device.tickets > 0 ? "#1E40AF" : "#EF4444",
                          }}
                        >
                          {device.tickets} 🎫
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedDevice(device)}
                        style={{
                          width: "100%",
                          padding: "6px",
                          background: "#1E40AF",
                          border: "none",
                          borderRadius: 6,
                          color: "white",
                          fontSize: 11,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Editar
                      </button>
                    </div>
                  ))}
              </div>

              {selectedDevice && (
                <div
                  style={{
                    background: CARD,
                    borderRadius: 12,
                    padding: 16,
                    marginTop: 20,
                    border: `2px solid #1E40AF`,
                  }}
                >
                  <h3 style={{ margin: "0 0 12px", color: "#1E40AF" }}>
                    Editar: {selectedDevice.id.substring(0, 20)}...
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
                            ticketAction === action ? "#1E40AF" : "transparent",
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
                        {action === "add" && "➕"}
                        {action === "subtract" && "➖"}
                        {action === "set" && "🎯"}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="number"
                      min="0"
                      value={ticketAmount}
                      onChange={(e) => setTicketAmount(e.target.value)}
                      placeholder="Cantidad"
                      style={inp}
                    />
                    <button
                      onClick={handleTicketOperation}
                      disabled={loading}
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
                      onClick={() => setSelectedDevice(null)}
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
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
