"use client";

import { createContext, useContext } from "react";
import type { ClientSession } from "@/lib/client-auth-server";

const ClientSessionContext = createContext<ClientSession | null>(null);

export function ClientSessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: ClientSession | null;
}) {
  return (
    <ClientSessionContext.Provider value={session}>
      {children}
    </ClientSessionContext.Provider>
  );
}

export function useClientSession() {
  return useContext(ClientSessionContext);
}
