"use client";

import axios from "axios";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type NetworkLoadingContextValue = {
  pendingRequests: number;
};

const NetworkLoadingContext = createContext<NetworkLoadingContextValue>({ pendingRequests: 0 });

export const useNetworkLoading = () => useContext(NetworkLoadingContext);

function isTrackableUrl(rawUrl: string) {
  if (typeof window === "undefined") return false;
  if (!rawUrl) return false;

  try {
    const url = new URL(rawUrl, window.location.origin);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

function shouldTrackFetch(args: Parameters<typeof fetch>) {
  const input = args[0];

  if (typeof input === "string") {
    return isTrackableUrl(input);
  }

  if (input instanceof URL) {
    return isTrackableUrl(input.toString());
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    return isTrackableUrl(input.url);
  }

  return false;
}

function shouldTrackAxiosRequest(url?: string, baseURL?: string) {
  if (!url) return false;

  try {
    const resolved = new URL(url, baseURL || window.location.origin);
    return resolved.origin === window.location.origin;
  } catch {
    return false;
  }
}

function GlobalLoadingOverlay({ visible, pendingRequests }: { visible: boolean; pendingRequests: number }) {
  if (!visible || pendingRequests <= 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/75 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-lg border border-gray-200">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <div className="text-sm font-medium text-gray-800">Loading data…</div>
      </div>
    </div>
  );
}

export default function NetworkLoadingProvider({ children }: { children: React.ReactNode }) {
  const [pendingRequests, setPendingRequests] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const originalFetchRef = useRef<typeof fetch>();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const increment = () => setPendingRequests((count) => count + 1);
    const decrement = () => setPendingRequests((count) => Math.max(0, count - 1));

    originalFetchRef.current = window.fetch;
    window.fetch = (async (...args) => {
      if (!shouldTrackFetch(args)) {
        return await originalFetchRef.current!.apply(window, args as any);
      }

      increment();
      try {
        // bind original fetch to window to avoid illegal invocation errors
        return await originalFetchRef.current!.apply(window, args as any);
      } finally {
        decrement();
      }
    }) as typeof fetch;

    const reqInterceptor = axios.interceptors.request.use((config) => {
      if (!(typeof window !== "undefined" && shouldTrackAxiosRequest(config.url, config.baseURL))) {
        return config;
      }

      (config as any).__trackNetworkLoading = true;
      increment();
      return config;
    });
    const resInterceptor = axios.interceptors.response.use(
      (response) => {
        if ((response.config as any)?.__trackNetworkLoading) {
          decrement();
        }
        return response;
      },
      (error) => {
        if ((error?.config as any)?.__trackNetworkLoading) {
          decrement();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
      }
      axios.interceptors.request.eject(reqInterceptor);
      axios.interceptors.response.eject(resInterceptor);
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (pendingRequests > 0) {
      timer = setTimeout(() => setOverlayVisible(true), 150);
    } else {
      setOverlayVisible(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [pendingRequests]);

  const contextValue = useMemo(() => ({ pendingRequests }), [pendingRequests]);

  return (
    <NetworkLoadingContext.Provider value={contextValue}>
      {children}
      <GlobalLoadingOverlay visible={overlayVisible} pendingRequests={pendingRequests} />
    </NetworkLoadingContext.Provider>
  );
}
