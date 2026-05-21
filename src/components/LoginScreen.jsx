import { APP_VERSION, UNCP_ENDPOINT } from "../utils/constants.js";
import { shortId } from "../utils/formatting.js";

export default function LoginScreen({ deviceId, onSelectRole }) {
  return (
    <main className="auth-shell screen">
      <section className="auth-panel">
        <div className="brand-mark">UNCP</div>
        <h1>Comedor UNCP Pro</h1>
        <p>Gestion de tickets y registro automatizado autorizado.</p>

        <div className="role-grid">
          <button type="button" className="role-button role-client" onClick={() => onSelectRole("client")}>
            <span>Estudiante</span>
            <small>Registrar ticket</small>
          </button>
          <button type="button" className="role-button role-admin" onClick={() => onSelectRole("admin")}>
            <span>Administrador</span>
            <small>Gestionar sistema</small>
          </button>
        </div>

        <footer className="auth-footer">
          <code>Device {shortId(deviceId)}</code>
          <span>{APP_VERSION}</span>
          <span>{UNCP_ENDPOINT}</span>
        </footer>
      </section>
    </main>
  );
}
