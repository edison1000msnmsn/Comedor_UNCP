import { api } from "./apiService.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const uncpService = {
  async register({ deviceId, dni, codigo, shotNumber }) {
    return api.post(`/api/device/${encodeURIComponent(deviceId)}/uncp-register`, {
      dni,
      codigo,
      shotNumber
    });
  },

  async fireShots({ deviceId, dni, codigo, config, onLog }) {
    const shots = Number(config?.shots || 1);
    const intervalMs = Number(config?.intervalMs || 0);
    const logs = [];
    let successCount = 0;

    for (let index = 0; index < shots; index += 1) {
      const startedAt = Date.now();
      const shotNumber = index + 1;
      try {
        const response = await this.register({ deviceId, dni, codigo, shotNumber });
        successCount += response.success ? 1 : 0;
        const log = {
          shotNumber,
          status: response.success ? "success" : "error",
          elapsedMs: Date.now() - startedAt,
          message: response.message || "Respuesta recibida"
        };
        logs.push(log);
        onLog?.(log);
      } catch (error) {
        const log = {
          shotNumber,
          status: "error",
          elapsedMs: Date.now() - startedAt,
          message: error.message
        };
        logs.push(log);
        onLog?.(log);
      }

      if (index < shots - 1 && intervalMs > 0) {
        await sleep(intervalMs);
      }
    }

    return { successCount, logs };
  }
};
