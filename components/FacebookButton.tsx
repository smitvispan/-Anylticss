// e.g. components/FacebookButton.tsx
"use client";
import { signIn } from "next-auth/react";

export default function FacebookButton() {
  return (
    <button
      onClick={() => signIn("facebook")}
      className="rounded-lg px-4 py-2 bg-blue-600 text-white"
    >
      Continue with Facebook
    </button>
  );
}
