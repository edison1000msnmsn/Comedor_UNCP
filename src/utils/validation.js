export const validateDNI = (dni) => /^\d{8}$/.test(String(dni || ""));
export const validateCodigo = (codigo) => /^\d{4,12}$/.test(String(codigo || ""));
export const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));

export function validateAmount(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0;
}
