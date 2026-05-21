import { useEffect, useMemo, useState } from "react";
import ConfirmDialog from "./ConfirmDialog.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";
import { useDebounce } from "../hooks/useDebounce.js";
import { useToast } from "../hooks/useToast.js";
import { api } from "../services/apiService.js";
import { storage } from "../services/storageService.js";
import { ADMIN_EMAIL } from "../utils/constants.js";
import { formatDateTime, shortId } from "../utils/formatting.js";
import { validateAmount, validateEmail } from "../utils/validation.js";

export default function AdminApp({ onBack }) {
  const notify = useToast();
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(storage.getAdminToken() || "");
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [ticketAction, setTicketAction] = useState("add");
  const [ticketAmount, setTicketAmount] = useState("1");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const debouncedSearch = useDebounce(search, 250);

  const authed = Boolean(token);
  const authOptions = { token };

  async function login() {
    if (!validateEmail(email) || !password) {
      notify("warning", "Ingresa email y password validos.");
      return;
    }
    setLoading(true);
    try {
      const data = await api.post("/admin/login", { email, password });
      storage.setAdminToken(data.token);
      setToken(data.token);
      notify("success", "Sesion iniciada.");
    } catch (error) {
      notify("error", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAdminData() {
    if (!token) return;
    setLoading(true);
    try {
      const [devicesData, registrationsData, statsData, configData] = await Promise.all([
        api.get("/admin/devices", authOptions),
        api.get("/admin/registrations", authOptions),
        api.get("/admin/stats", authOptions),
        api.get("/admin/config", authOptions)
      ]);
      setDevices(devicesData.devices || devicesData);
      setRegistrations(registrationsData.registrations || []);
      setStats(statsData);
      setConfig(configData.config);
    } catch (error) {
      notify("error", error.message);
      if (error.message === "Unauthorized") logout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, [token]);

  const filteredDevices = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    return devices.filter((device) => device.id.toLowerCase().includes(term));
  }, [devices, debouncedSearch]);

  function logout() {
    storage.clearAdminToken();
    setToken("");
    setPassword("");
  }

  async function submitTicketOperation() {
    if (!selectedDevice || !validateAmount(ticketAmount)) {
      notify("warning", "Cantidad invalida.");
      return;
    }
    const endpoint = {
      add: "add-tickets",
      subtract: "subtract-tickets",
      set: "set-tickets"
    }[ticketAction];
    try {
      await api.post(`/admin/devices/${encodeURIComponent(selectedDevice.id)}/${endpoint}`, { amount: Number(ticketAmount) }, authOptions);
      setSelectedDevice(null);
      await loadAdminData();
      notify("success", "Tickets actualizados.");
    } catch (error) {
      notify("error", error.message);
    }
  }

  async function updateConfig(key, value) {
    const next = { ...config, [key]: Number(value) };
    setConfig(next);
    try {
      const data = await api.post("/admin/config", next, authOptions);
      setConfig(data.config);
    } catch (error) {
      notify("error", error.message);
    }
  }

  async function deleteDevice() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/admin/devices/${encodeURIComponent(deleteTarget.id)}`, authOptions);
      setDeleteTarget(null);
      await loadAdminData();
      notify("success", "Dispositivo eliminado.");
    } catch (error) {
      notify("error", error.message);
    }
  }

  if (!authed) {
    return (
      <main className="auth-shell screen">
        <section className="auth-panel">
          <button className="text-button" type="button" onClick={onBack}>Volver</button>
          <h1>Panel administrador</h1>
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && login()} />
          </label>
          <button className="btn btn-blue full" type="button" onClick={login} disabled={loading}>
            {loading ? <LoadingSpinner size="sm" text="Validando" /> : "Ingresar"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell screen">
      <header className="admin-header">
        <div>
          <span>COMEDOR UNCP PRO</span>
          <h1>Administracion</h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-muted" type="button" onClick={loadAdminData}>Recargar</button>
          <button className="btn btn-danger" type="button" onClick={logout}>Salir</button>
        </div>
      </header>

      <nav className="tabs">
        {["dashboard", "devices", "registrations", "config"].map((item) => (
          <button key={item} type="button" className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
            {item === "dashboard" ? "Dashboard" : item === "devices" ? "Dispositivos" : item === "registrations" ? "Registros" : "Configuracion"}
          </button>
        ))}
      </nav>

      <section className="admin-content">
        {loading && <LoadingSpinner text="Actualizando" />}

        {tab === "dashboard" && stats && (
          <div className="kpi-grid">
            <Kpi label="Dispositivos" value={stats.total_devices} />
            <Kpi label="Tickets disponibles" value={stats.total_tickets_in_system} />
            <Kpi label="Registros totales" value={stats.total_registrations} />
            <Kpi label="Registros hoy" value={stats.registrations_today} />
          </div>
        )}

        {tab === "devices" && (
          <>
            <div className="toolbar">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar device ID" />
            </div>
            <div className="device-grid">
              {filteredDevices.map((device) => (
                <article className="device-card" key={device.id}>
                  <code>{shortId(device.id, 14)}</code>
                  <strong className={device.tickets > 0 ? "ok" : "bad"}>{device.tickets} tickets</strong>
                  <small>Creado: {formatDateTime(device.created_at)}</small>
                  <div className="row-actions">
                    <button className="btn btn-blue" type="button" onClick={() => setSelectedDevice(device)}>Editar</button>
                    <button className="btn btn-danger" type="button" onClick={() => setDeleteTarget(device)}>Eliminar</button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {tab === "registrations" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>DNI</th>
                  <th>Codigo</th>
                  <th>Shot</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {registrations.slice(-50).reverse().map((registration) => (
                  <tr key={registration.id}>
                    <td>{formatDateTime(registration.timestamp)}</td>
                    <td>{registration.dni}</td>
                    <td>{registration.codigo}</td>
                    <td>{registration.shot_number}</td>
                    <td><span className={`pill ${registration.status}`}>{registration.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "config" && config && (
          <section className="panel config-panel">
            {[
              ["targetHour", "Hora objetivo", 0, 23],
              ["targetMinute", "Minuto objetivo", 0, 59],
              ["preFireMs", "Pre-disparo ms", 0, 5000],
              ["shots", "Numero de intentos", 1, 20],
              ["intervalMs", "Intervalo ms", 0, 1000]
            ].map(([key, label, min, max]) => (
              <label className="range-field" key={key}>
                <span>{label}<strong>{config[key]}</strong></span>
                <input type="range" min={min} max={max} value={config[key]} onChange={(event) => updateConfig(key, event.target.value)} />
              </label>
            ))}
            <div className="summary-note">
              Ventana aproximada: {Number(config.preFireMs) + Number(config.shots) * Number(config.intervalMs)} ms.
            </div>
          </section>
        )}
      </section>

      {selectedDevice && (
        <div className="modal-backdrop">
          <section className="modal">
            <h2>Editar tickets</h2>
            <p><code>{shortId(selectedDevice.id)}</code> tiene <strong>{selectedDevice.tickets}</strong> tickets.</p>
            <div className="segmented">
              {["add", "subtract", "set"].map((action) => (
                <button type="button" key={action} className={ticketAction === action ? "active" : ""} onClick={() => setTicketAction(action)}>
                  {action === "add" ? "Agregar" : action === "subtract" ? "Restar" : "Establecer"}
                </button>
              ))}
            </div>
            <label className="field">
              <span>Cantidad</span>
              <input type="number" min="0" value={ticketAmount} onChange={(event) => setTicketAmount(event.target.value)} />
            </label>
            <div className="modal-actions">
              <button className="btn btn-muted" type="button" onClick={() => setSelectedDevice(null)}>Cancelar</button>
              <button className="btn btn-primary" type="button" onClick={submitTicketOperation}>Confirmar</button>
            </div>
          </section>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar dispositivo"
          message={`Se eliminara ${shortId(deleteTarget.id)} y sus tickets actuales.`}
          variant="danger"
          confirmText="Eliminar"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={deleteDevice}
        />
      )}
    </main>
  );
}

function Kpi({ label, value }) {
  return (
    <article className="kpi-card">
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
    </article>
  );
}
