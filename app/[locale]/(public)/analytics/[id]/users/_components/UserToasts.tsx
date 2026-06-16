"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "@/components/ui/use-toast";

export default function UserToasts() {
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!searchParams) return;
        if (searchParams.get("updated") === "1") {
            toast({
                title: "User Updated",
                description: "The user details and subscription have been updated successfully.",
                variant: "default",
            });
        }
        if (searchParams.get("created") === "1") {
            toast({
                title: "User Created",
                description: "The new user has been invited successfully.",
                variant: "default",
            });
        }
        if (searchParams.get("deleted") === "1") {
            toast({
                title: "User Deleted",
                description: "The user has been removed from your team.",
            });
        }
    }, [searchParams]);

    return null;
}
