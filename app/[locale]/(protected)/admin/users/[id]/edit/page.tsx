// app/(protected)/admin/users/[id]/edit/page.tsx
import User from "@/models/User";
import { notFound } from "next/navigation";
import { getAdminOwnerContext } from "@/lib/admin-user-scope";
import { updateUserAction, deleteUserAction } from "../../actions";
import DeleteUserButton from "@/components/admin/DeleteUserButton";
import { Link } from "@/i18n/routing";
import EditClientForm from "./EditClientForm";
import { getOwnerChannelAssignmentOptions } from "@/lib/channel-assignment-options";

type Params = Promise<{ id: string; locale: string }>;

export default async function EditUserPage({ params }: { params: Params }) {
  const { id } = await params;
  const ownerContext = await getAdminOwnerContext();
  const ownerId = ownerContext?.ownerId || null;
  const ownerEmail = ownerContext?.adminEmail || "";

  if (!ownerId) {
    notFound();
  }

  const userRaw = await User.findOne({
    _id: id,
    parent_client_id: ownerId,
    role: "user",
    isAdmin: false,
  }, {
    name: 1,
    email: 1,
    image: 1,
    isAdmin: 1,
    mainPage: 1,
    mainInstagram: 1,
    mainAd: 1,
    mainGoogleAd: 1,
    mainSEOsites: 1,
    googleSearchConsoleAccounts: 1,
    createdAt: 1,
    updatedAt: 1,
  })
    .lean();
  if (!userRaw) notFound();

  const { pages, instas, ads, subAccounts, gscSite } = await getOwnerChannelAssignmentOptions({
    ownerId,
    ownerEmail,
  });

  const user = JSON.parse(JSON.stringify(userRaw));

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-6 lg:py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">Admin · People</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Edit user</h1>
            <p className="mt-1 text-sm text-slate-600">
              Update login access, rotate credentials, and adjust the channels this user owns.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
          >
            ← Back to Users
          </Link>
        </div>

        <EditClientForm
          user={user}
          pages={pages}
          instas={instas}
          ads={ads}
          subAccounts={subAccounts}
          gscSite={gscSite}
          updateUserAction={updateUserAction}
        />

        <div className="mt-6">
          <DeleteUserButton id={user._id?.toString() ?? ""} serverAction={deleteUserAction} />
        </div>
      </div>
    </div>
  );
}
