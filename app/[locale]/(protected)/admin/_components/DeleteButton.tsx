"use client";

import React from "react";
import { useFormStatus } from "react-dom";

export default function DeleteButton({ id }: { id?: string }) {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className={`inline-flex items-center rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:-translate-y-0.5 hover:bg-rose-50 ${pending ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={(e) => {
                if (!confirm("Are you sure you want to delete this user and all associated data?")) {
                    e.preventDefault();
                }
            }}
        >
            {pending ? "Deleting..." : "Delete"}
        </button>
    );
}
