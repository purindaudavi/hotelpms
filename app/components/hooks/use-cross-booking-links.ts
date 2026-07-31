"use client";

import { useEffect, useMemo, useState } from "react";
import {
  crossBookingRecordsToLinks,
  getCrossBookingApiErrorMessage,
  listCrossBookings,
  type CrossBookingRecord
} from "@/app/lib/cross-booking-api";

export function useCrossBookingLinks(propertyId: string) {
  const [records, setRecords] = useState<CrossBookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    listCrossBookings(propertyId)
      .then((items) => {
        if (!cancelled) setRecords(items);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setRecords([]);
        setError(getCrossBookingApiErrorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId, reload]);

  const links = useMemo(() => crossBookingRecordsToLinks(records), [records]);

  return {
    links,
    records,
    loading,
    error,
    refresh: () => setReload((value) => value + 1)
  };
}
