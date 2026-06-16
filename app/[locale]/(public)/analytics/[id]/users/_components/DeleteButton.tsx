"use client";

import React from "react";
import { useFormStatus } from "react-dom";

export default function DeleteButton({ id }: { id?: string }) {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className={`bg-rose-50 text-rose-700 hover:bg-rose-100 transition px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-100 ${pending ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={(e) => {
                if (!confirm("Are you sure you want to delete this user?")) {
                    e.preventDefault();
                }
            }}
        >
            {pending ? "Deleting..." : "Delete"}
        </button>
    );
}
