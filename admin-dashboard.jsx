import { useState, useEffect } from "react";

const TEAL = "#0D9488";
const DARK = "#0F172A";
const CARD = "#1E293B";
const BORDER = "#334155";

// Replace with your actual admin token
const ADMIN_TOKEN = "admin-secret-token-change-this";
const API_BASE = "http://localhost:3000";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${ADMIN_TOKEN}`,
};

export default function AdminDashboard() {
  const [tab, setTab] = useState("devices"); // devices | registrations | stats | config
  const [devices, setDevices] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [ticketAction, setTicketAction] = useState(""); // add | subtract | set
  const [ticketAmount, setTicketAmount] = useState("");
  const [searchDevice, setSearchDevice] = useState("");

  useEffect(() => {
    loadDevices();
    loadRegistrations();
    loadStats();
    loadConfig();
  }, []);

  const loadDevices = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/devices`, { headers });
      const data = await res.json();
      setDevices(data);
    } catch (err) {
      console.error("Error loading devices:", err);
    }
  };

  const loadRegistrations = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/registrations`, { headers });
      const data = await res.json();
      setRegistrations(data.registrations || []);
    } catch (err) {
      console.error("Error loading registrations:", err);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, { headers });
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/config`, { headers });
      const data = await res.json();
      setConfig(data.config);
    } catch (err) {
      console.error("Error loading config:", err);
    }
  };

  const handleTicketOperation = async () => {
    if (!selectedDevice || !ticketAmount) return;

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
        headers,
        body: JSON.stringify({ amount: parseInt(ticketAmount) }),
      });

      if (res.ok) {
        loadDevices();
        setSelectedDevice(null);
        setTicketAction("");
        setTicketAmount("");
        alert("Operación exitosa");
      }
    } catch (err) {
      alert("Error en la operación");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigUpdate = async (key, value) => {
    if (!config) return;

    const newConfig = {
      ...config,
      [key]: parseInt(value),
    };

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/config`, {
        method: "POST",
        headers,
        body: JSON.stringify(newConfig),
      });

      if (res.ok) {
        setConfig(newConfig);
        alert("Configuración actualizada");
      }
    } catch (err) {
      alert("Error al actualizar");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (!window.confirm(`¿Eliminar dispositivo ${deviceId}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/admin/devices/${deviceId}`, {
        method: "DELETE",
        headers,
      });

      if (res.ok) {
        loadDevices();
        alert("Dispositivo eliminado");
      }
    } catch (err) {
      alert("Error al eliminar");
      console.error(err);
    }
  };

  const filteredDevices = devices.filter((d) =>
    d.id.toLowerCase().includes(searchDevice.toLowerCase())
  );

  const inp = {
    padding: "8px 12px",
    background: "#0F172A",
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    color: "#E2E8F0",
    fontSize: 13,
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  };

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
          background: TEAL,
          padding: "16px 20px",
          borderBottom: `1px solid #0F766E`,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            color: "white",
          }}
        >
          🔑 Panel de Administrador
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "#CCFBF1" }}>
          Gestión de dispositivos y tickets
        </p>
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
          ["devices", "📱 Dispositivos"],
          ["registrations", "📋 Registros"],
          ["stats", "📊 Estadísticas"],
          ["config", "⚙️ Configuración"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: "12px 18px",
              border: "none",
              background: "transparent",
              color: tab === id ? TEAL : "#64748B",
              fontSize: 12,
              fontWeight: tab === id ? 700 : 400,
              cursor: "pointer",
              borderBottom: tab === id ? `2px solid ${TEAL}` : "2px solid transparent",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: 20, maxWidth: 1200 }}>
        {/* ===== DISPOSITIVOS ===== */}
        {tab === "devices" && (
          <>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 20,
                alignItems: "center",
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
                  padding: "10px 12px",
                  fontSize: 14,
                }}
              />
              <button
                onClick={loadDevices}
                style={{
                  padding: "10px 16px",
                  background: TEAL,
                  border: "none",
                  borderRadius: 8,
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              >
                🔄 Recargar
              </button>
            </div>

            {selectedDevice && (
              <div
                style={{
                  background: CARD,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                  border: `2px solid ${TEAL}`,
                }}
              >
                <h3 style={{ margin: "0 0 12px", color: TEAL }}>
                  Modificar tickets: {selectedDevice.id}
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  {["add", "subtract", "set"].map((action) => (
                    <button
                      key={action}
                      onClick={() => setTicketAction(action)}
                      style={{
                        padding: "8px",
                        background:
                          ticketAction === action ? TEAL : "transparent",
                        border: `1px solid ${ticketAction === action ? TEAL : BORDER}`,
                        color:
                          ticketAction === action ? "white" : "#64748B",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: 12,
                        fontFamily: "inherit",
                      }}
                    >
                      {action === "add" && "➕ Agregar"}
                      {action === "subtract" && "➖ Restar"}
                      {action === "set" && "🎯 Establecer"}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
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
                      padding: "8px 20px",
                      background: loading ? "#475569" : TEAL,
                      border: "none",
                      borderRadius: 8,
                      color: "white",
                      fontWeight: 700,
                      cursor: loading ? "wait" : "pointer",
                      fontSize: 13,
                      fontFamily: "inherit",
                    }}
                  >
                    {loading ? "Procesando..." : "Confirmar"}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDevice(null);
                      setTicketAction("");
                      setTicketAmount("");
                    }}
                    style={{
                      padding: "8px 16px",
                      background: "#475569",
                      border: "none",
                      borderRadius: 8,
                      color: "#CBD5E1",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: 13,
                      fontFamily: "inherit",
                    }}
                  >
                    Cancelar
                  </button>
                </div>

                <div
                  style={{
                    background: "#0F172A",
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 11,
                    color: "#64748B",
                  }}
                >
                  <p style={{ margin: 0 }}>
                    Tickets actuales: <strong style={{ color: TEAL }}>{selectedDevice.tickets}</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Devices table */}
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
                    <th style={{ padding: "12px", textAlign: "left", color: TEAL }}>
                      Device ID
                    </th>
                    <th style={{ padding: "12px", textAlign: "center", color: TEAL }}>
                      🎫 Tickets
                    </th>
                    <th style={{ padding: "12px", textAlign: "center", color: TEAL }}>
                      Creado
                    </th>
                    <th style={{ padding: "12px", textAlign: "center", color: TEAL }}>
                      Último uso
                    </th>
                    <th style={{ padding: "12px", textAlign: "center", color: TEAL }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevices.map((device) => (
                    <tr
                      key={device.id}
                      style={{
                        borderBottom: `1px solid ${BORDER}`,
                        background: selectedDevice?.id === device.id ? "#1E293B99" : "transparent",
                      }}
                    >
                      <td
                        style={{
                          padding: "12px",
                          color: "#CBD5E1",
                          fontFamily: "monospace",
                          fontSize: 11,
                        }}
                      >
                        {device.id.substring(0, 30)}...
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "center",
                          color: device.tickets > 0 ? TEAL : "#F87171",
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {device.tickets}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "center",
                          color: "#64748B",
                          fontSize: 11,
                        }}
                      >
                        {new Date(device.created_at).toLocaleDateString("es-PE")}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "center",
                          color: device.last_used ? "#CBD5E1" : "#475569",
                          fontSize: 11,
                        }}
                      >
                        {device.last_used
                          ? new Date(device.last_used).toLocaleString("es-PE")
                          : "—"}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <button
                          onClick={() => setSelectedDevice(device)}
                          style={{
                            padding: "5px 10px",
                            background: TEAL,
                            border: "none",
                            borderRadius: 6,
                            color: "white",
                            fontSize: 11,
                            fontWeight: 600,
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
                            padding: "5px 10px",
                            background: "#EF4444",
                            border: "none",
                            borderRadius: 6,
                            color: "white",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p
              style={{
                marginTop: 16,
                fontSize: 11,
                color: "#475569",
                textAlign: "center",
              }}
            >
              Total: {filteredDevices.length} dispositivos
            </p>
          </>
        )}

        {/* ===== REGISTROS ===== */}
        {tab === "registrations" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    background: CARD,
                    borderRadius: 10,
                    padding: 14,
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: "#64748B",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Total de registros
                  </p>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 20,
                      fontWeight: 800,
                      color: TEAL,
                    }}
                  >
                    {registrations.length}
                  </p>
                </div>

                <div
                  style={{
                    background: CARD,
                    borderRadius: 10,
                    padding: 14,
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: "#64748B",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Últimas 24h
                  </p>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 20,
                      fontWeight: 800,
                      color: "#34D399",
                    }}
                  >
                    {
                      registrations.filter((r) => {
                        const regTime = new Date(r.timestamp).getTime();
                        return Date.now() - regTime < 86400000;
                      }).length
                    }
                  </p>
                </div>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 11,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: CARD,
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    <th style={{ padding: "10px", textAlign: "left", color: TEAL }}>
                      Timestamp
                    </th>
                    <th style={{ padding: "10px", textAlign: "left", color: TEAL }}>
                      DNI
                    </th>
                    <th style={{ padding: "10px", textAlign: "left", color: TEAL }}>
                      Código
                    </th>
                    <th style={{ padding: "10px", textAlign: "center", color: TEAL }}>
                      Shot
                    </th>
                    <th style={{ padding: "10px", textAlign: "left", color: TEAL }}>
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
                      <td style={{ padding: "10px", color: "#94A3B8" }}>
                        {new Date(reg.timestamp).toLocaleString("es-PE")}
                      </td>
                      <td style={{ padding: "10px", color: "#CBD5E1" }}>
                        {reg.dni}
                      </td>
                      <td style={{ padding: "10px", color: "#CBD5E1" }}>
                        {reg.codigo}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          textAlign: "center",
                          color: "#64748B",
                        }}
                      >
                        {reg.shot_number}
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            background: "#065F46",
                            color: "#34D399",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
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
          </>
        )}

        {/* ===== ESTADÍSTICAS ===== */}
        {tab === "stats" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            {stats && [
              {
                label: "Dispositivos registrados",
                value: stats.total_devices,
                icon: "📱",
              },
              {
                label: "Tickets en el sistema",
                value: stats.total_tickets_in_system,
                icon: "🎫",
              },
              {
                label: "Total de registros",
                value: stats.total_registrations,
                icon: "📋",
              },
              {
                label: "Registros hoy",
                value: stats.registrations_today,
                icon: "📊",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: CARD,
                  borderRadius: 12,
                  padding: 18,
                  border: `1px solid ${BORDER}`,
                  textAlign: "center",
                }}
              >
                <p style={{ margin: 0, fontSize: 28, marginBottom: 8 }}>
                  {stat.icon}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: "#64748B",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 6,
                  }}
                >
                  {stat.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 28,
                    fontWeight: 800,
                    color: TEAL,
                  }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ===== CONFIGURACIÓN ===== */}
        {tab === "config" && config && (
          <div style={{ maxWidth: 600 }}>
            <div
              style={{
                background: CARD,
                borderRadius: 12,
                padding: 20,
                border: `1px solid ${BORDER}`,
              }}
            >
              <h2 style={{ margin: "0 0 20px", color: TEAL }}>
                Parámetros de disparo
              </h2>

              {[
                { key: "targetHour", label: "Hora objetivo", min: 0, max: 23 },
                {
                  key: "targetMinute",
                  label: "Minuto objetivo",
                  min: 0,
                  max: 59,
                },
                {
                  key: "preFireMs",
                  label: "Pre-disparo (ms antes)",
                  min: 0,
                  max: 5000,
                },
                { key: "shots", label: "Número de disparos", min: 1, max: 50 },
                {
                  key: "intervalMs",
                  label: "Intervalo entre disparos (ms)",
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
                    <span style={{ fontSize: 13, color: TEAL, fontWeight: 700 }}>
                      {config[key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={config[key]}
                    onChange={(e) => handleConfigUpdate(key, e.target.value)}
                    style={{
                      width: "100%",
                      accentColor: TEAL,
                      cursor: "pointer",
                    }}
                  />
                </div>
              ))}

              {/* Summary */}
              <div
                style={{
                  background: "#0F172A",
                  borderRadius: 10,
                  padding: 12,
                  marginTop: 20,
                  border: `1px solid ${BORDER}`,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: "#64748B",
                    marginBottom: 6,
                  }}
                >
                  <strong style={{ color: TEAL }}>Resumen:</strong>
                </p>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 16,
                    fontSize: 11,
                    color: "#94A3B8",
                  }}
                >
                  <li>
                    Hora: {String(config.targetHour).padStart(2, "0")}:
                    {String(config.targetMinute).padStart(2, "0")}
                  </li>
                  <li>Pre-fire: {config.preFireMs}ms antes</li>
                  <li>
                    Ventana total: {config.preFireMs + config.shots * config.intervalMs}
                    ms
                  </li>
                  <li>
                    {config.shots} disparos × {config.intervalMs}ms intervalo
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
