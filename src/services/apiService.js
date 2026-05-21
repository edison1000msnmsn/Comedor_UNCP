import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { API_BASE } from "../utils/constants.js";

const DEFAULT_TIMEOUT = 8000;

async function request(path, options = {}) {
  const { retries = 2, timeout = DEFAULT_TIMEOUT, token, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(fetchOptions.headers || {})
    };

    if (Capacitor.isNativePlatform()) {
      return nativeRequest(path, { ...fetchOptions, headers, timeout });
    }

    return browserRequest(path, { ...fetchOptions, headers, signal: controller.signal });
  } catch (error) {
    if (retries > 0 && error.name !== "AbortError") {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return request(path, { ...options, retries: retries - 1 });
    }
    throw new Error(error.name === "AbortError" ? "Tiempo de espera agotado" : error.message);
  } finally {
    clearTimeout(timer);
  }
}

async function browserRequest(path, fetchOptions) {
  const response = await fetch(`${API_BASE}${path}`, fetchOptions);
  const text = await response.text();
  const data = parsePayload(text);

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}

async function nativeRequest(path, fetchOptions) {
  const method = String(fetchOptions.method || "GET").toUpperCase();
  const response = await CapacitorHttp.request({
    url: `${API_BASE}${path}`,
    method,
    headers: fetchOptions.headers,
    data: parsePayload(fetchOptions.body),
    connectTimeout: fetchOptions.timeout,
    readTimeout: fetchOptions.timeout,
    responseType: "json"
  });

  const data = typeof response.data === "string" ? parsePayload(response.data) : response.data || {};
  if (response.status < 200 || response.status >= 300) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}

function parsePayload(value) {
  if (!value) return {};
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export const api = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) =>
    request(path, { ...options, method: "POST", body: JSON.stringify(body || {}) }),
  put: (path, body, options) =>
    request(path, { ...options, method: "PUT", body: JSON.stringify(body || {}) }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" })
};
