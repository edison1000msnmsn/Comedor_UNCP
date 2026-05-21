const DEVICE_KEY = "comedor_uncp_device_id";
const ADMIN_TOKEN_KEY = "comedor_uncp_admin_token";

export function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = `DEV-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, deviceId);
  }
  return deviceId;
}

export const storage = {
  getAdminToken: () => localStorage.getItem(ADMIN_TOKEN_KEY),
  setAdminToken: (token) => localStorage.setItem(ADMIN_TOKEN_KEY, token),
  clearAdminToken: () => localStorage.removeItem(ADMIN_TOKEN_KEY)
};
