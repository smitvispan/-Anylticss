// components/admin/DeleteUserButton.tsx
"use client";

export default function DeleteUserButton({
  id,
  serverAction,
}: {
  id: string;
  // Passing server action to client component is allowed
  serverAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form>
      <input type="hidden" name="id" value={id} />
      <button
        formAction={serverAction}
        type="submit"
        onClick={(e) => {
          // This onClick lives entirely in the Client Component
          if (!confirm("Delete this user? This cannot be undone.")) {
            e.preventDefault();
          }
        }}
        className="rounded border border-red-600 text-red-700 px-4 py-2 hover:bg-red-50"
      >
        Delete
      </button>
    </form>
  );
}
