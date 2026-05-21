export const APP_VERSION = "v2.1 PRODUCTION READY";

export const COLORS = {
  teal: "#0d9488",
  blue: "#1e40af",
  dark: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  success: "#10b981",
  error: "#ef4444",
  warning: "#f59e0b"
};

export const API_BASE =
  import.meta.env.VITE_API_BASE || "https://comedoruncp-production.up.railway.app";
export const UNCP_ENDPOINT =
  import.meta.env.VITE_UNCP_ENDPOINT || "https://comedor.uncp.edu.pe/charola";
export const DEBUG = String(import.meta.env.VITE_DEBUG ?? "false") === "true";
