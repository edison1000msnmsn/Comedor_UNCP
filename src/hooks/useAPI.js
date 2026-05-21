import { useCallback, useEffect, useState } from "react";
import { api } from "../services/apiService.js";

export function useAPI(path, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!path) return null;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(path, options);
      setData(response);
      return response;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [path, JSON.stringify(options)]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
