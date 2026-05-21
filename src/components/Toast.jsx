import { useEffect } from "react";

export default function Toast({ type = "info", message, onClose }) {
  useEffect(() => {
    const id = setTimeout(onClose, 3200);
    return () => clearTimeout(id);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`} role="status">
      <strong>{type === "success" ? "OK" : type === "error" ? "Error" : type === "warning" ? "Aviso" : "Info"}</strong>
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Cerrar">x</button>
    </div>
  );
}
