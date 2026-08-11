import { useEffect, useState } from "react";
import { getCAStatus, CAStatus } from "../services/ca.service";

export function useCAStatus() {
  const [data, setData] = useState<CAStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  async function loadStatus() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await getCAStatus();

      setData(response);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: loadStatus,
  };
}