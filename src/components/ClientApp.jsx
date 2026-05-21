import html2canvas from "html2canvas";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { useEffect, useRef, useState } from "react";
import LoadingSpinner from "./LoadingSpinner.jsx";
import { useCountdown } from "../hooks/useCountdown.js";
import { useToast } from "../hooks/useToast.js";
import { api } from "../services/apiService.js";
import { uncpService } from "../services/uncpService.js";
import { DEBUG, UNCP_ENDPOINT } from "../utils/constants.js";
import { formatDateTime, formatMs, shortId } from "../utils/formatting.js";
import { validateCodigo, validateDNI } from "../utils/validation.js";

export default function ClientApp({ deviceId, onBack }) {
  const notify = useToast();
  const [screen, setScreen] = useState("login");
  const [dni, setDni] = useState("");
  const [codigo, setCodigo] = useState("");
  const [tickets, setTickets] = useState(0);
  const [verified, setVerified] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState("idle");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [successData, setSuccessData] = useState(null);
  const [ticketSavedPath, setTicketSavedPath] = useState("");
  const firedRef = useRef(false);
  const autoTicketRef = useRef(false);
  const { countdown, remainingMs, targetDate } = useCountdown(config, screen === "live");

  const dniOk = validateDNI(dni);
  const codigoOk = validateCodigo(codigo);

  async function loadTickets(dniValue = dni) {
    if (!validateDNI(dniValue)) return 0;
    try {
      const data = await api.get(`/api/student/${encodeURIComponent(dniValue)}/tickets?deviceId=${encodeURIComponent(deviceId)}`);
      setTickets(data.tickets || 0);
      setVerified(true);
      return data.tickets || 0;
    } catch (error) {
      notify("warning", "No se pudo consultar tickets. Verifica el backend.");
      return 0;
    }
  }

  useEffect(() => {
    if (dniOk) loadTickets(dni);
    if (!dniOk) {
      setTickets(0);
      setVerified(false);
      setRequestSent(false);
    }
  }, [dni, deviceId]);

  async function continueLogin() {
    if (!dniOk || !codigoOk) {
      notify("warning", "Revisa DNI y codigo universitario.");
      return;
    }
    const available = await loadTickets(dni);
    if (available <= 0) {
      await requestTicket();
      return;
    }
    setScreen("confirm");
  }

  async function requestTicket() {
    setLoading(true);
    try {
      await api.post(`/api/student/${encodeURIComponent(dni)}/request-ticket`, {
        codigo,
        deviceId
      });
      setRequestSent(true);
      notify("success", "Solicitud enviada al administrador.");
    } catch (error) {
      notify("error", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function startRegistration() {
    if (tickets <= 0) {
      notify("error", "Este DNI no tiene tickets disponibles.");
      return;
    }

    setLoading(true);
    try {
      const targetConfig = await api.get("/api/config/target-time");
      setConfig(targetConfig);
      setStatus("waiting");
      setLogs([]);
      firedRef.current = false;
      setScreen("live");
    } catch (error) {
      notify("error", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function fire() {
    firedRef.current = true;
    setStatus("firing");
    setLogs([]);
    const startedAt = Date.now();
    const result = await uncpService.fireShots({
      deviceId,
      dni,
      codigo,
      config,
      onLog: (log) => setLogs((current) => [...current, log])
    });

    if (result.successCount > 0) {
      await api.post(`/api/student/${encodeURIComponent(dni)}/use-ticket`);
      await loadTickets();
      const payload = {
        dni,
        codigo,
        ticketId: `TCK-${Date.now().toString(36).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - startedAt,
        shotsFired: config?.shots || 1,
        shotsSuccess: result.successCount
      };
      setSuccessData(payload);
      setStatus("success");
      setScreen("success");
      notify("success", "Registro completado.");
    } else {
      setStatus("error");
      notify("error", "Todos los intentos fallaron.");
    }
  }

  useEffect(() => {
    if (screen !== "live" || !config || firedRef.current) return;
    const preFireMs = Number(config.preFireMs || 0);
    if (remainingMs <= preFireMs) fire();
  }, [screen, config, remainingMs]);

  async function captureTicketImage() {
    const element = document.getElementById("ticket-capture");
    if (!element) return null;
    const canvas = await html2canvas(element, { backgroundColor: "#0f172a", scale: 2 });
    return canvas.toDataURL("image/png");
  }

  async function saveTicketAndOpenOfficial(openOfficial = false) {
    if (!successData) return;
    try {
      const dataUrl = await captureTicketImage();
      if (!dataUrl) return;
      const fileName = `${successData.ticketId}.png`;

      if (Capacitor.isNativePlatform()) {
        const base64 = dataUrl.split(",")[1];
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Documents
        });
        setTicketSavedPath(result.uri || fileName);
        notify("success", "Ticket guardado en el dispositivo.");
      } else {
        downloadDataUrl(dataUrl, fileName);
      }

      if (openOfficial) {
        await Browser.open({ url: UNCP_ENDPOINT });
      }
    } catch (error) {
      notify("warning", `No se pudo guardar automaticamente: ${error.message}`);
      if (openOfficial) window.open(UNCP_ENDPOINT, "_blank", "noopener,noreferrer");
    }
  }

  function downloadDataUrl(dataUrl, fileName) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    link.click();
  }

  useEffect(() => {
    if (screen !== "success" || !successData || autoTicketRef.current) return undefined;
    autoTicketRef.current = true;
    const id = setTimeout(() => saveTicketAndOpenOfficial(true), 650);
    return () => clearTimeout(id);
  }, [screen, successData]);

  if (screen === "login") {
    return (
      <main className="app-shell narrow screen">
        <button className="text-button" type="button" onClick={onBack}>Volver</button>
        <section className="panel">
          <div className="section-title">
            <span>Estudiante</span>
            <h1>Ingresa tus datos</h1>
          </div>
          <label className="field">
            <span>DNI</span>
            <input value={dni} maxLength={8} inputMode="numeric" onChange={(event) => setDni(event.target.value.replace(/\D/g, ""))} placeholder="72345678" />
            {dni && !dniOk && <small>DNI debe tener 8 digitos.</small>}
          </label>
          <label className="field">
            <span>Codigo universitario</span>
            <input value={codigo} autoCapitalize="characters" onChange={(event) => setCodigo(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} placeholder="2021A0001" />
            {codigo && !codigoOk && <small>Usa 4 a 16 caracteres: letras, numeros o guion.</small>}
          </label>
          <div className="ticket-meter">
            <span>{verified ? "Tickets disponibles para este DNI" : "Ingresa DNI para verificar cupo"}</span>
            <strong className={tickets > 0 ? "ok" : "bad"}>{tickets}</strong>
          </div>
          {verified && tickets <= 0 && (
            <div className="summary-note">
              No tienes cupo asignado. Presiona continuar para enviar una solicitud al administrador y comunicate para confirmar el pago.
            </div>
          )}
          {requestSent && (
            <div className="summary-note ok">
              Solicitud enviada. El administrador vera tu DNI y podra asignarte tickets.
            </div>
          )}
          <button className="btn btn-primary full" type="button" disabled={!dniOk || !codigoOk} onClick={continueLogin}>
            {loading ? <LoadingSpinner size="sm" text="Procesando" /> : tickets > 0 ? "Continuar" : "Solicitar ticket"}
          </button>
          <code className="device-code">Device {shortId(deviceId)}</code>
        </section>
      </main>
    );
  }

  if (screen === "confirm") {
    return (
      <main className="app-shell narrow screen">
        <section className="panel">
          <div className="section-title">
            <span>Confirmacion</span>
            <h1>Registro al comedor</h1>
          </div>
          <div className="summary-list">
            <p><span>DNI</span><strong>{dni}</strong></p>
            <p><span>Codigo</span><strong>{codigo}</strong></p>
            <p><span>Costo</span><strong>1 ticket</strong></p>
            <p><span>Destino</span><code>{UNCP_ENDPOINT}</code></p>
          </div>
          <button className="btn btn-primary full" type="button" disabled={loading} onClick={startRegistration}>
            {loading ? <LoadingSpinner size="sm" text="Conectando" /> : "Aceptar"}
          </button>
          <button className="btn btn-muted full" type="button" onClick={() => setScreen("login")}>Cancelar</button>
        </section>
      </main>
    );
  }

  if (screen === "live") {
    return (
      <main className="app-shell narrow live-screen screen">
        <section className="panel centered">
          <span className={`status-badge status-${status}`}>{status === "waiting" ? "Esperando" : status === "firing" ? "Disparando" : status === "success" ? "Exito" : "Error"}</span>
          <p className="target-time">Objetivo: {targetDate.toLocaleTimeString("es-PE")}</p>
          <strong className={`countdown ${status === "firing" ? "pulse" : ""}`}>{countdown}</strong>
          {status === "waiting" && <button className="btn btn-muted full" type="button" onClick={() => setScreen("confirm")}>Cancelar</button>}
          {logs.length > 0 && (
            <div className="log-box">
              {logs.map((log) => (
                <p key={log.shotNumber} className={log.status}>
                  Shot {log.shotNumber}: {log.message} ({formatMs(log.elapsedMs)})
                </p>
              ))}
            </div>
          )}
          {DEBUG && <code>{JSON.stringify(config)}</code>}
        </section>
      </main>
    );
  }

  if (screen === "success" && successData) {
    return (
      <main className="app-shell narrow screen">
        <section className="success-head">
          <span className="success-icon">OK</span>
          <h1>Registrado en UNCP</h1>
          <p>{successData.shotsSuccess} de {successData.shotsFired} intentos exitosos</p>
        </section>
        <section id="ticket-capture" className="ticket-card">
          <span>Ticket comedor UNCP</span>
          <strong>{successData.ticketId}</strong>
          <div className="summary-list">
            <p><span>DNI</span><b>{successData.dni}</b></p>
            <p><span>Codigo</span><b>{successData.codigo}</b></p>
            <p><span>Hora</span><b>{formatDateTime(successData.timestamp)}</b></p>
            <p><span>Tiempo</span><b>{formatMs(successData.elapsedMs)}</b></p>
          </div>
        </section>
        {ticketSavedPath && <p className="summary-note">Captura guardada: {ticketSavedPath}</p>}
        <button className="btn btn-primary full" type="button" onClick={() => saveTicketAndOpenOfficial(true)}>
          Guardar captura y abrir web oficial
        </button>
        <button className="btn btn-muted full" type="button" onClick={() => { setDni(""); setCodigo(""); setSuccessData(null); setTicketSavedPath(""); autoTicketRef.current = false; setScreen("login"); }}>
          Nuevo registro
        </button>
      </main>
    );
  }

  return null;
}
