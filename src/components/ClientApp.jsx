import html2canvas from "html2canvas";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { useEffect, useRef, useState } from "react";
import LoadingSpinner from "./LoadingSpinner.jsx";
import { useCountdown } from "../hooks/useCountdown.js";
import { useToast } from "../hooks/useToast.js";
import { api } from "../services/apiService.js";
import { UNCP_ENDPOINT } from "../utils/constants.js";
import { formatDateTime, formatMs, shortId } from "../utils/formatting.js";
import { validateCodigo, validateDNI } from "../utils/validation.js";

const SAVED_STUDENT_KEY = "comedor_uncp_student_data";

export default function ClientApp({ deviceId, onBack }) {
  const notify = useToast();
  const savedStudent = readSavedStudent();
  const [screen, setScreen] = useState("login");
  const [dni, setDni] = useState(savedStudent.dni || "");
  const [codigo, setCodigo] = useState(savedStudent.codigo || "");
  const [tickets, setTickets] = useState(0);
  const [verified, setVerified] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [ticketSavedPath, setTicketSavedPath] = useState("");
  const [officialOpened, setOfficialOpened] = useState(false);
  const [copiedField, setCopiedField] = useState("");
  const alertRef = useRef(false);
  const autoTicketRef = useRef(false);
  const startRef = useRef(0);
  const { countdown, remainingMs, targetDate } = useCountdown(config, screen === "ready" || screen === "official");

  const dniOk = validateDNI(dni);
  const codigoOk = validateCodigo(codigo);
  const openAheadMs = Number(config?.openAheadSeconds || 0) * 1000;
  const readyToOpen = remainingMs <= openAheadMs;

  useEffect(() => {
    localStorage.setItem(SAVED_STUDENT_KEY, JSON.stringify({ dni, codigo }));
  }, [dni, codigo]);

  async function loadTickets(dniValue = dni) {
    if (!validateDNI(dniValue)) return 0;
    try {
      const data = await api.get(`/api/student/${encodeURIComponent(dniValue)}/tickets?deviceId=${encodeURIComponent(deviceId)}`);
      setTickets(data.tickets || 0);
      setVerified(true);
      return data.tickets || 0;
    } catch {
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
      await api.post(`/api/student/${encodeURIComponent(dni)}/request-ticket`, { codigo, deviceId });
      setRequestSent(true);
      notify("success", "Solicitud enviada al administrador.");
    } catch (error) {
      notify("error", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function startAssistant() {
    if (tickets <= 0) {
      notify("error", "Este DNI no tiene tickets disponibles.");
      return;
    }
    setLoading(true);
    try {
      const targetConfig = await api.get("/api/config/target-time");
      setConfig(targetConfig);
      setOfficialOpened(false);
      alertRef.current = false;
      startRef.current = Date.now();
      setScreen("ready");
    } catch (error) {
      notify("error", error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if ((screen !== "ready" && screen !== "official") || !config || alertRef.current) return;
    if (remainingMs <= openAheadMs) {
      alertRef.current = true;
      notify("success", "Abre la web oficial y genera tu ticket manualmente.");
      vibrate();
      beep();
      openOfficialWeb();
    }
  }, [screen, config, remainingMs, openAheadMs]);

  async function copyText(value, label) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setCopiedField(label);
      notify("success", `${label} copiado.`);
      setTimeout(() => setCopiedField(""), 1200);
    } catch {
      notify("warning", `No se pudo copiar ${label}.`);
    }
  }

  async function openOfficialWeb() {
    setOfficialOpened(true);
    setScreen("official");
    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: UNCP_ENDPOINT });
        return;
      }
      window.open(UNCP_ENDPOINT, "_blank", "noopener,noreferrer");
    } catch {
      window.open(UNCP_ENDPOINT, "_blank", "noopener,noreferrer");
    }
  }

  async function confirmOfficialTicket() {
    setLoading(true);
    try {
      await api.post(`/api/device/${encodeURIComponent(deviceId)}/uncp-register`, {
        dni,
        codigo
      });
      await api.post(`/api/student/${encodeURIComponent(dni)}/use-ticket`);
      await loadTickets();
      setSuccessData({
        dni,
        codigo,
        ticketId: `TCK-${Date.now().toString(36).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - startRef.current
      });
      setScreen("success");
      notify("success", "Ticket confirmado internamente.");
    } catch (error) {
      notify("error", error.message);
    } finally {
      setLoading(false);
    }
  }

  function vibrate() {
    if (navigator.vibrate) navigator.vibrate([220, 120, 220, 120, 420]);
  }

  function beep() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const context = new AudioCtx();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 880;
      gain.gain.value = 0.08;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        context.close();
      }, 260);
    } catch {
      // Audio is best-effort only.
    }
  }

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
        const result = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Data });
        setTicketSavedPath(result.uri || fileName);
        notify("success", "Ticket guardado en el dispositivo.");
      } else {
        downloadDataUrl(dataUrl, fileName);
      }
      if (openOfficial) await Browser.open({ url: UNCP_ENDPOINT });
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
    const id = setTimeout(() => saveTicketAndOpenOfficial(false), 650);
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
              No tienes cupo asignado. Presiona continuar para enviar una solicitud al administrador.
            </div>
          )}
          {requestSent && (
            <div className="summary-note ok">
              Solicitud enviada. El administrador vera tu DNI y podra asignarte tickets.
            </div>
          )}
          <button className="btn btn-primary full" type="button" disabled={!dniOk || !codigoOk || loading} onClick={continueLogin}>
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
            <span>Preparacion</span>
            <h1>Listo para la web oficial</h1>
          </div>
          <div className="summary-list">
            <p><span>DNI</span><strong>{dni}</strong></p>
            <p><span>Codigo</span><strong>{codigo}</strong></p>
            <p><span>Costo interno</span><strong>1 ticket</strong></p>
            <p><span>Web oficial</span><code>{UNCP_ENDPOINT}</code></p>
          </div>
          <div className="copy-grid">
            <button className="btn btn-muted" type="button" onClick={() => copyText(dni, "DNI")}>{copiedField === "DNI" ? "DNI copiado" : "Copiar DNI"}</button>
            <button className="btn btn-muted" type="button" onClick={() => copyText(codigo, "Codigo")}>{copiedField === "Codigo" ? "Codigo copiado" : "Copiar codigo"}</button>
          </div>
          <button className="btn btn-primary full" type="button" disabled={loading} onClick={startAssistant}>
            {loading ? <LoadingSpinner size="sm" text="Conectando" /> : "Preparar contador"}
          </button>
          <button className="btn btn-blue full" type="button" onClick={openOfficialWeb}>Abrir web oficial ahora</button>
          <button className="btn btn-muted full" type="button" onClick={() => setScreen("login")}>Cancelar</button>
        </section>
      </main>
    );
  }

  if (screen === "ready" || screen === "official") {
    return (
      <main className="app-shell narrow live-screen screen">
        <section className="panel centered">
          <span className={`status-badge ${readyToOpen ? "status-success" : "status-waiting"}`}>
            {readyToOpen ? "Abrir web oficial" : "Preparado"}
          </span>
          <p className="target-time">Objetivo: {targetDate.toLocaleTimeString("es-PE")}</p>
          {config?.openAheadSeconds > 0 && (
            <p className="summary-note">La web se abre {config.openAheadSeconds} segundos antes para que el usuario complete el registro.</p>
          )}
          <strong className={`countdown ${readyToOpen ? "pulse" : ""}`}>{countdown}</strong>
          <div className="summary-list">
            <p><span>DNI</span><strong>{dni}</strong></p>
            <p><span>Codigo</span><strong>{codigo}</strong></p>
          </div>
          <div className="copy-grid">
            <button className="btn btn-muted" type="button" onClick={() => copyText(dni, "DNI")}>Copiar DNI</button>
            <button className="btn btn-muted" type="button" onClick={() => copyText(codigo, "Codigo")}>Copiar codigo</button>
          </div>
          <button className="btn btn-primary full" type="button" onClick={openOfficialWeb}>
            {officialOpened ? "Reabrir web oficial" : "Abrir web oficial"}
          </button>
          <button className="btn btn-blue full" type="button" disabled={loading} onClick={confirmOfficialTicket}>
            {loading ? <LoadingSpinner size="sm" text="Confirmando" /> : "Ya obtuve el ticket oficial"}
          </button>
          {!Capacitor.isNativePlatform() && <iframe className="official-frame" title="Comedor UNCP" src={UNCP_ENDPOINT} />}
          <button className="btn btn-muted full" type="button" onClick={() => setScreen("confirm")}>Volver</button>
        </section>
      </main>
    );
  }

  if (screen === "success" && successData) {
    return (
      <main className="app-shell narrow screen">
        <section className="success-head">
          <span className="success-icon">OK</span>
          <h1>Ticket confirmado</h1>
          <p>Registro interno actualizado</p>
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
        <button className="btn btn-muted full" type="button" onClick={() => { setSuccessData(null); setTicketSavedPath(""); autoTicketRef.current = false; setScreen("login"); }}>
          Nuevo registro
        </button>
      </main>
    );
  }

  return null;
}

function readSavedStudent() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_STUDENT_KEY) || "{}");
  } catch {
    return {};
  }
}
