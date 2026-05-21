import { useEffect, useMemo, useState } from "react";
import { formatCountdown } from "../utils/formatting.js";

function getTargetDate(hour, minute) {
  const target = new Date();
  target.setHours(Number(hour || 0), Number(minute || 0), 0, 0);
  if (target <= new Date()) target.setDate(target.getDate() + 1);
  return target;
}

export function useCountdown(config, enabled = true) {
  const [remainingMs, setRemainingMs] = useState(0);
  const targetDate = useMemo(
    () => getTargetDate(config?.targetHour ?? config?.hour, config?.targetMinute ?? config?.minute),
    [config?.targetHour, config?.targetMinute, config?.hour, config?.minute]
  );

  useEffect(() => {
    if (!enabled) return undefined;
    const tick = () => setRemainingMs(Math.max(0, targetDate.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [enabled, targetDate]);

  return {
    countdown: formatCountdown(remainingMs),
    remainingMs,
    targetReached: remainingMs <= 0,
    targetDate
  };
}
