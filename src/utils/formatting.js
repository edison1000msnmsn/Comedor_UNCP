export function formatCountdown(ms) {
  const value = Math.max(0, Number(ms) || 0);
  const h = Math.floor(value / 3600000);
  const m = Math.floor((value % 3600000) / 60000);
  const s = Math.floor((value % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatMs(ms) {
  const value = Math.max(0, Number(ms) || 0);
  const s = Math.floor(value / 1000);
  const msec = value % 1000;
  return `${String(s).padStart(2, "0")}.${String(msec).padStart(3, "0")}s`;
}

export function shortId(id, size = 12) {
  if (!id) return "";
  return id.length <= size * 2 ? id : `${id.slice(0, size)}...${id.slice(-6)}`;
}

export function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "medium"
  });
}
