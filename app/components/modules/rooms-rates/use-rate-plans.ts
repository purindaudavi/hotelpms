"use client";

import { useCallback, useEffect, useState } from "react";
import type { RatePlan } from "../front-desk/types";
import { getRatePlans, getRatesApiErrorMessage } from "@/app/lib/rates-api";

export function useRatePlans(propertyId: string) {
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshRatePlans = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRatePlans(await getRatePlans(propertyId));
    } catch (requestError) {
      setError(getRatesApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    void refreshRatePlans();
  }, [refreshRatePlans]);

  return { ratePlans, setRatePlans, loading, error, refreshRatePlans };
}
