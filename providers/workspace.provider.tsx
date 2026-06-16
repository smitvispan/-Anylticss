"use client";

import { createContext, useContext } from "react";

export type WorkspaceInfo = {
    id: string;
    name: string;
    role: string;
    planName?: string;
    canResell?: boolean;
    assignments?: {
        mainPage?: string | null;
        mainInstagram?: string | null;
        mainAd?: string | null;
        mainGoogleAd?: string | null;
        mainSEOsites?: string | null;
        connectAll?: boolean;
    };
};

const WorkspaceContext = createContext<WorkspaceInfo | null>(null);

export function WorkspaceProvider({
    children,
    workspace,
}: {
    children: React.ReactNode;
    workspace: WorkspaceInfo | null;
}) {
    return (
        <WorkspaceContext.Provider value={workspace}>
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspace() {
    return useContext(WorkspaceContext);
}
