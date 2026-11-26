"use client";

import { useCallback, useEffect, useState } from "react";
import { friendlyError, getWithRetry, RequestError } from "@/components/customer/http";

export function useData<T>(url: string | null) {
  const [state, setState] = useState<{ data?: T; error?: string; status?: number }>({});
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    getWithRetry<T>(url, { signal: controller.signal }).then(
      (data) => { if (!controller.signal.aborted) setState({ data }); },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ error: friendlyError(error), status: error instanceof RequestError ? error.status : undefined });
        }
      },
    );
    return () => controller.abort();
  }, [url, revision]);

  return { ...state, refresh, loading: Boolean(url && !state.data && !state.error) };
}
