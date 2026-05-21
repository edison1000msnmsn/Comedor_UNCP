import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "./LoadingSpinner.jsx";
import { useDebounce } from "../hooks/useDebounce.js";
import { useToast } from "../hooks/useToast.js";
import { api } from "../services/apiService.js";
import { storage } from "../services/storageService.js";
import { formatDateTime, shortId } from "../utils/formatting.js";
import { validateAmount, validateDNI, validateEmail } from "../utils/validation.js";

export default function AdminApp({ onBack }) {
  const notify = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(storage.getAdminToken() || "");
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [manualDni, setManualDni] = useState("");
  const [ticketAction, setTicketAction] = useState("add");
  const [ticketAmount, setTicketAmount] = useState("1");
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
      const [studentsData, requestsData, registrationsData, statsData, configData] = await Promise.all([
        api.get("/admin/students", authOptions),
        api.get("/admin/ticket-requests", authOptions),
        api.get("/admin/registrations", authOptions),
        api.get("/admin/stats", authOptions),
        api.get("/admin/config", authOptions)
      ]);
      setStudents(studentsData.students || []);
      setRequests(requestsData.requests || []);
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

  const filteredStudents = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    return students.filter((student) =>
      student.dni.includes(term) || String(student.codigo || "").toLowerCase().includes(term)
    );
  }, [students, debouncedSearch]);

  const pendingRequests = requests.filter((request) => request.status === "pending");

  function logout() {
    storage.clearAdminToken();
    setToken("");
    setPassword("");
  }

  function openManualStudent() {
    if (!validateDNI(manualDni)) {
      notify("warning", "Ingresa un DNI valido de 8 digitos.");
      return;
    }
    const existing = students.find((student) => student.dni === manualDni);
    setSelectedStudent(existing || { dni: manualDni, codigo: "", tickets: 0 });
  }

  async function submitTicketOperation(target = selectedStudent, action = ticketAction, amount = ticketAmount) {
    if (!target?.dni || !validateDNI(target.dni) || !validateAmount(amount)) {
      notify("warning", "DNI o cantidad invalida.");
      return;
    }
    const endpoint = {
      add: "add-tickets",
      subtract: "subtract-tickets",
      set: "set-tickets"
    }[action];
    try {
      await api.post(
        `/admin/students/${encodeURIComponent(target.dni)}/${endpoint}`,
        { amount: Number(amount), codigo: target.codigo || "" },
        authOptions
      );
      setSelectedStudent(null);
      await loadAdminData();
      notify("success", "Cupos actualizados.");
    } catch (error) {
      notify("error", error.message);
    }
  }

  async function approveRequest(request) {
    await submitTicketOperation({ dni: request.dni, codigo: request.codigo }, "add", 1);
    try {
      await api.post(`/admin/ticket-requests/${request.id}/resolve`, { status: "approved" }, authOptions);
      await loadAdminData();
    } catch (error) {
      notify("warning", "Ticket agregado, pero no se pudo cerrar la solicitud.");
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
        {["dashboard", "students", "requests", "registrations", "config"].map((item) => (
          <button key={item} type="button" className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
            {item === "dashboard" ? "Dashboard" : item === "students" ? "Cupos por DNI" : item === "requests" ? `Solicitudes (${pendingRequests.length})` : item === "registrations" ? "Registros" : "Configuracion"}
          </button>
        ))}
      </nav>

      <section className="admin-content">
        {loading && <LoadingSpinner text="Actualizando" />}

        {tab === "dashboard" && stats && (
          <div className="kpi-grid">
            <Kpi label="Estudiantes" value={stats.total_students} />
            <Kpi label="Solicitudes pendientes" value={stats.pending_requests} />
            <Kpi label="Tickets disponibles" value={stats.total_tickets_in_system} />
            <Kpi label="Registros hoy" value={stats.registrations_today} />
          </div>
        )}

        {tab === "students" && (
          <>
            <div className="toolbar">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar DNI o codigo" />
            </div>
            <div className="toolbar">
              <input value={manualDni} maxLength={8} inputMode="numeric" onChange={(event) => setManualDni(event.target.value.replace(/\D/g, ""))} placeholder="DNI para otorgar cupos" />
              <button className="btn btn-primary" type="button" onClick={openManualStudent}>Otorgar por DNI</button>
            </div>
            <div className="device-grid">
              {filteredStudents.map((student) => (
                <article className="device-card" key={student.dni}>
                  <code>DNI {student.dni}</code>
                  <strong className={student.tickets > 0 ? "ok" : "bad"}>{student.tickets} cupos</strong>
                  <small>Codigo: {student.codigo || "-"}</small>
                  <small>Device: {student.last_device_id ? shortId(student.last_device_id, 10) : "-"}</small>
                  <small>Actualizado: {formatDateTime(student.updated_at)}</small>
                  <div className="row-actions">
                    <button className="btn btn-blue" type="button" onClick={() => setSelectedStudent(student)}>Editar cupos</button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {tab === "requests" && (
          <div className="device-grid">
            {requests.length === 0 && <p className="summary-note">Aun no hay solicitudes.</p>}
            {requests.map((request) => (
              <article className="device-card" key={request.id}>
                <code>DNI {request.dni}</code>
                <strong className={request.status === "pending" ? "bad" : "ok"}>{request.status}</strong>
                <small>Codigo: {request.codigo}</small>
                <small>Device: {request.device_id ? shortId(request.device_id, 10) : "-"}</small>
                <small>Solicitado: {formatDateTime(request.timestamp)}</small>
                {request.status === "pending" && (
                  <button className="btn btn-primary" type="button" onClick={() => approveRequest(request)}>
                    Aprobar y agregar 1 cupo
                  </button>
                )}
              </article>
            ))}
          </div>
        )}

        {tab === "registrations" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>DNI</th>
                  <th>Codigo</th>
                  <th>Metodo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {registrations.slice(-50).reverse().map((registration) => (
                  <tr key={registration.id}>
                    <td>{formatDateTime(registration.timestamp)}</td>
                    <td>{registration.dni}</td>
                    <td>{registration.codigo}</td>
                    <td>{registration.method || "asistido"}</td>
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
              ["openAheadSeconds", "Abrir web segundos antes", 0, 60]
            ].map(([key, label, min, max]) => (
              <label className="range-field" key={key}>
                <span>{label}<strong>{config[key]}</strong></span>
                <input type="range" min={min} max={max} value={config[key]} onChange={(event) => updateConfig(key, event.target.value)} />
              </label>
            ))}
            <div className="summary-note">
              Modo asistido: la app avisa, copia datos y abre la web oficial. El estudiante genera el ticket manualmente.
            </div>
          </section>
        )}
      </section>

      {selectedStudent && (
        <div className="modal-backdrop">
          <section className="modal">
            <h2>Editar cupos por DNI</h2>
            <p><code>{selectedStudent.dni}</code> tiene <strong>{selectedStudent.tickets || 0}</strong> cupos.</p>
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
              <button className="btn btn-muted" type="button" onClick={() => setSelectedStudent(null)}>Cancelar</button>
              <button className="btn btn-primary" type="button" onClick={() => submitTicketOperation()}>Confirmar</button>
            </div>
          </section>
        </div>
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
