import { useCallback, useEffect, useState } from "react";
import {
  getCAStatus,
  type CAProfile,
  type CAStatus,
} from "../services/ca.service";

export function useCAStatus(profile: CAProfile) {
  const [data, setData] = useState<CAStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const loadStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await getCAStatus(profile);
      setData(response);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  return {
    data,
    isLoading,
    error,
    refetch: loadStatus,
  };
}
