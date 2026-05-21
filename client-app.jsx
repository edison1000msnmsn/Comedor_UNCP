import { useState, useEffect, useRef } from "react";
import html2canvas from "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";

const TEAL = "#0D9488";
const DARK = "#0F172A";
const CARD = "#1E293B";
const BORDER = "#334155";
const API_BASE = "https://api.comedor-uncp.local/api"; // Cambiar por tu dominio

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

export default function ClientApp() {
  const [deviceId, setDeviceId] = useState("");
  const [screen, setScreen] = useState("login"); // login | registro | viviendo | exito
  const [ticketsAvailable, setTicketsAvailable] = useState(0);
  const [dni, setDni] = useState("");
  const [codigo, setCodigo] = useState("");
  const [countdown, setCountdown] = useState("00:00:00");
  const [fireTime, setFireTime] = useState(null);
  const [status, setStatus] = useState("idle"); // waiting | firing | success | error
  const [targetTime, setTargetTime] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [loading, setLoading] = useState(false);

  const scheduledRef = useRef(false);
  const firedRef = useRef(false);
  const countdownRef = useRef(null);

  useEffect(() => {
    const did = getDeviceId();
    setDeviceId(did);
    checkTickets(did);
  }, []);

  const checkTickets = async (did) => {
    try {
      const res = await fetch(`${API_BASE}/device/${did}/tickets`);
      const data = await res.json();
      setTicketsAvailable(data.tickets || 0);
    } catch (err) {
      console.error("Error checking tickets:", err);
    }
  };

  const handleLogin = () => {
    if (!dni.trim() || !codigo.trim()) {
      alert("Ingresa tu DNI y código universitario");
      return;
    }
    setScreen("registro");
  };

  const handleStartRegistration = async () => {
    if (ticketsAvailable <= 0) {
      alert("No tienes tickets disponibles. Contáctame para comprar.");
      return;
    }

    if (!dni.trim() || !codigo.trim()) {
      alert("Completa DNI y código");
      return;
    }

    // Get target time from server
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/config/target-time`);
      const data = await res.json();
      setTargetTime(data);
      scheduledRef.current = true;
      firedRef.current = false;
      setStatus("waiting");
      setScreen("viviendo");
    } catch (err) {
      alert("Error al conectar con el servidor");
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

      if (scheduledRef.current && !firedRef.current && diff <= targetTime.preFireMs && diff >= 0) {
        firedRef.current = true;
        fireShots();
      }
    };

    const id = setInterval(tick, 100); // Every 100ms is smooth enough
    return () => clearInterval(id);
  }, [screen, targetTime]);

  const fireShots = async () => {
    setStatus("firing");
    const startTime = Date.now();

    try {
      const promises = [];
      for (let i = 0; i < (targetTime?.shots || 5); i++) {
        setTimeout(() => {
          promises.push(
            fetch(`${API_BASE}/register`, {
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
        const elapsedMs = Date.now() - startTime;
        
        // Deduct ticket
        await fetch(`${API_BASE}/device/${deviceId}/use-ticket`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        // Update available tickets
        await checkTickets(deviceId);

        setSuccessData({
          timestamp: new Date().toLocaleString("es-PE"),
          elapsedMs,
          ticketsUsed: 1,
          dni,
          codigo,
          registered_at: new Date().toISOString(),
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
      console.error("Capture error:", err);
      alert("Error al capturar el ticket");
    }
  };

  // =====================
  // LOGIN SCREEN
  // =====================
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
        <div
          style={{
            width: "100%",
            maxWidth: 340,
          }}
        >
          {/* Logo/Header */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
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
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 800,
                color: "#F1F5F9",
              }}
            >
              Comedor UNCP
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748B" }}>
              Registro de Tickets
            </p>
          </div>

          {/* Form */}
          <div
            style={{
              background: CARD,
              borderRadius: 16,
              padding: 24,
              border: `1px solid ${BORDER}`,
              marginBottom: 16,
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
                  letterSpacing: 0.5,
                  fontWeight: 600,
                }}
              >
                DNI del estudiante
              </label>
              <input
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="72345678"
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  background: "#0F172A",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  color: "#F1F5F9",
                  fontSize: 15,
                  boxSizing: "border-box",
                  outline: "none",
                }}
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
                  fontWeight: 600,
                }}
              >
                Código Universitario
              </label>
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="2021100001"
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  background: "#0F172A",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  color: "#F1F5F9",
                  fontSize: 15,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            {/* Tickets display */}
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

          {/* CTA Button */}
          <button
            onClick={handleLogin}
            disabled={!dni.trim() || !codigo.trim()}
            style={{
              width: "100%",
              padding: "13px",
              background: !dni.trim() || !codigo.trim() ? "#475569" : TEAL,
              border: "none",
              borderRadius: 12,
              color: "white",
              fontWeight: 700,
              fontSize: 14,
              cursor: !dni.trim() || !codigo.trim() ? "default" : "pointer",
              transition: "background 0.2s",
              marginBottom: 12,
              fontFamily: "inherit",
            }}
          >
            {ticketsAvailable > 0 ? "Continuar" : "Sin tickets"}
          </button>

          {/* Footer info */}
          <p
            style={{
              margin: 0,
              fontSize: 10,
              color: "#475569",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            Device ID: <code style={{ color: "#94A3B8", fontSize: 9 }}>{deviceId.slice(0, 20)}...</code>
          </p>
        </div>
      </div>
    );
  }

  // =====================
  // REGISTRATION SCREEN
  // =====================
  if (screen === "registro") {
    return (
      <div
        style={{
          fontFamily: "'System', -apple-system, BlinkMacSystemFont, sans-serif",
          background: DARK,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          color: "#CBD5E1",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 320,
            textAlign: "center",
          }}
        >
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: 18,
              fontWeight: 700,
              color: "#F1F5F9",
            }}
          >
            Confirmar Registro
          </h2>
          <p
            style={{
              margin: "0 0 28px",
              fontSize: 13,
              color: "#64748B",
            }}
          >
            DNI: <strong style={{ color: "#E2E8F0" }}>{dni}</strong>
          </p>

          {/* Ticket cost */}
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
              COSTO DE REGISTRO
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
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 11,
                color: "#475569",
              }}
            >
              Te quedará: <strong style={{ color: "#E2E8F0" }}>{ticketsAvailable - 1} tickets</strong>
            </p>
          </div>

          {/* Buttons */}
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
            {loading ? "Conectando..." : "Aceptar y Registrar"}
          </button>

          <button
            onClick={() => {
              setScreen("login");
              setStatus("idle");
            }}
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

  // =====================
  // LIVE COUNTDOWN SCREEN
  // =====================
  if (screen === "viviendo") {
    return (
      <div
        style={{
          fontFamily: "'System', -apple-system, BlinkMacSystemFont, sans-serif",
          background: DARK,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          color: "#CBD5E1",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 320,
            textAlign: "center",
          }}
        >
          {/* Status indicator */}
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
              letterSpacing: 0.5,
            }}
          >
            {status === "firing" && "🔥 Disparando"}
            {status === "waiting" && "⏳ Esperando"}
            {status === "success" && "✅ Éxito"}
            {status === "error" && "❌ Error"}
          </div>

          {/* Big countdown */}
          <div style={{ marginBottom: 32 }}>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 12,
                color: "#64748B",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Contador
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 52,
                fontWeight: 800,
                fontFamily: "monospace",
                letterSpacing: 2,
                color: TEAL,
              }}
            >
              {countdown}
            </p>
          </div>

          {/* Cancel button */}
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
                fontWeight: 600,
                fontSize: 13,
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

  // =====================
  // SUCCESS SCREEN WITH TICKET
  // =====================
  if (screen === "exito" && successData) {
    return (
      <div
        style={{
          fontFamily: "'System', -apple-system, BlinkMacSystemFont, sans-serif",
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          color: "#CBD5E1",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 340,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Success header */}
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div
              style={{
                fontSize: 48,
                marginBottom: 12,
              }}
            >
              ✅
            </div>
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
            <p style={{ margin: "0", fontSize: 12, color: "#64748B" }}>
              Tu ticket ha sido generado exitosamente
            </p>
          </div>

          {/* Ticket card - CAPTURE THIS */}
          <div
            id="ticket-capture"
            style={{
              background: CARD,
              borderRadius: 16,
              padding: 20,
              border: `2px solid ${TEAL}`,
              boxShadow: `0 0 16px ${TEAL}33`,
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
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 11,
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Ticket de Comedor
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 800,
                  color: TEAL,
                  fontFamily: "monospace",
                }}
              >
                {Date.now().toString(36).toUpperCase()}
              </p>
            </div>

            {/* Ticket details */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                  paddingBottom: 10,
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                <span style={{ fontSize: 11, color: "#64748B" }}>Estudiante</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>
                  {dni}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                  paddingBottom: 10,
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                <span style={{ fontSize: 11, color: "#64748B" }}>Código</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>
                  {codigo}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                  paddingBottom: 10,
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                <span style={{ fontSize: 11, color: "#64748B" }}>Hora</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>
                  {successData.timestamp}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 11, color: "#64748B" }}>Tiempo de respuesta</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: TEAL }}>
                  {fmtTime(successData.elapsedMs)}
                </span>
              </div>
            </div>

            {/* Barcode placeholder */}
            <div
              style={{
                background: "#0F172A",
                borderRadius: 8,
                padding: 12,
                textAlign: "center",
                fontSize: 22,
                letterSpacing: 8,
                fontFamily: "monospace",
                color: TEAL,
                wordBreak: "break-all",
              }}
            >
              ║ ║ ║║║ ║
            </div>
          </div>

          {/* Action buttons */}
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
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            📸 Descargar Ticket
          </button>

          <button
            onClick={() => {
              setScreen("login");
              setStatus("idle");
              setDni("");
              setCodigo("");
              setSuccessData(null);
            }}
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
            Nuevo Registro
          </button>

          {/* Info */}
          <p
            style={{
              margin: 0,
              fontSize: 10,
              color: "#475569",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            Presenta este ticket en la puerta del comedor.<br />
            Válido solo para hoy.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
