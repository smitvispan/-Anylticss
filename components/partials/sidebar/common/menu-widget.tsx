'use client'
import React from 'react'
import { useConfig } from '@/hooks/use-config'
import { useClientSession } from '@/providers/client-session.provider'
import { useWorkspace } from '@/providers/workspace.provider'
import { useParams } from 'next/navigation'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

const MenuWidget = () => {
    const [config] = useConfig();
    const session = useClientSession();
    const workspace = useWorkspace();
    const params = useParams();
    const idFromUrl = params?.id as string | undefined;

    const [dynamicWorkspace, setDynamicWorkspace] = React.useState<{
        role: string;
        planName: string;
        canResell: boolean;
    } | null>(null);

    React.useEffect(() => {
        if (idFromUrl && !workspace) {
            fetch(`/api/client/user-info?id=${idFromUrl}`)
                .then(res => res.json())
                .then(data => {
                    if (data?.role || data?.planName) {
                        setDynamicWorkspace({
                            role: typeof data?.role === "string" ? data.role : "",
                            planName: typeof data?.planName === "string" ? data.planName : "",
                            canResell: !!data?.canResell,
                        });
                    }
                })
                .catch(() => null);
        }
    }, [idFromUrl, workspace]);

    if (config.sidebar === 'compact' || config.collapsed) return null;

    const waitingForWorkspaceInfo = !!idFromUrl && !workspace && !dynamicWorkspace;
    if (waitingForWorkspaceInfo) return null;

    const effectiveRole = workspace?.role || dynamicWorkspace?.role || null;
    if (effectiveRole === "user") return null;

    const planName = workspace?.planName || dynamicWorkspace?.planName || session?.user?.planName;
    if (!planName) return null;

    const isReseller = workspace
        ? !!workspace.canResell
        : (dynamicWorkspace ? dynamicWorkspace.canResell : session?.user?.canResell);

    return (
        <div className="mx-4 my-6">
            <div className={cn(
                "rounded-2xl p-4 transition-all duration-300",
                isReseller
                    ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-100"
                    : "bg-slate-900 text-white shadow-xl shadow-slate-200"
            )}>
                <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        isReseller ? "bg-white/20" : "bg-sky-500/20"
                    )}>
                        <Icon
                            icon={isReseller ? "lucide:crown" : "lucide:shield-check"}
                            className={cn("w-4 h-4", isReseller ? "text-white" : "text-sky-400")}
                        />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Current Plan</p>
                        <p className="text-sm font-bold truncate">{planName}</p>
                    </div>
                </div>

                <div className={cn(
                    "rounded-xl p-2 text-[11px] font-medium flex items-center justify-center gap-2 transition-colors",
                    isReseller ? "bg-white/10 hover:bg-white/20" : "bg-sky-500/10 hover:bg-sky-500/20 text-sky-400"
                )}>
                    <span>Subscription Active</span>
                </div>
            </div>
        </div>
    )
}

export default MenuWidget
