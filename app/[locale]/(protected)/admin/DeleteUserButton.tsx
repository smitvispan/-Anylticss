// components/admin/DeleteUserButton.tsx
"use client";

export default function DeleteUserButton({
  id,
  action,
}: {
  id: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form
      action={async (formData) => {
        if (!confirm("Delete this user? This cannot be undone.")) return;
        formData.set("id", id);
        await action(formData); // calls your server action
      }}
    >
      <button
        type="submit"
        className="rounded border border-red-600 text-red-700 px-4 py-2 hover:bg-red-50"
      >
        Delete
      </button>
    </form>
  );
}
