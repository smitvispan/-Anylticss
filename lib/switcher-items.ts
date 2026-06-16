import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import type { AnalyticsSession } from "@/lib/analytics-session";
import type { SwitcherItem } from "@/lib/switcher-types";

export async function resolveSwitcherItemsForSession(
  session: AnalyticsSession | null
): Promise<SwitcherItem[]> {
  if (!session) return [];

  await connectDB();
  const { id, role } = session.user;

  if (role === "admin") {
    const clients = await User.find({ isAdmin: false, role: "client" })
      .select("_id name email role image")
      .lean();

    return clients.map((client: any) => ({
      id: String(client._id),
      name: client.name || "Unnamed Client",
      email: client.email,
      role: client.role,
      image: client.image,
    }));
  }

  if (role === "client") {
    const users = await User.find({ parent_client_id: id, role: "user" })
      .select("_id name email role image")
      .lean();
    const self = await User.findById(id).select("_id name email role image").lean();

    const items = users.map((user: any) => ({
      id: String(user._id),
      name: user.name || "Unnamed User",
      email: user.email,
      role: user.role,
      image: user.image,
    }));

    if (self) {
      items.unshift({
        id: String(self._id),
        name: self.name || "My Dashboard",
        email: self.email,
        role: self.role,
        image: self.image,
      });
    }

    return items;
  }

  return [];
}
