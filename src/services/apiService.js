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

    const response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      headers,
      signal: controller.signal
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
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

export const api = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) =>
    request(path, { ...options, method: "POST", body: JSON.stringify(body || {}) }),
  put: (path, body, options) =>
    request(path, { ...options, method: "PUT", body: JSON.stringify(body || {}) }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" })
};
