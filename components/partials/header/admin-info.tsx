import { useSession } from "next-auth/react";

const AdminInfo = () => {
  const { data: session } = useSession();

  return session;
};

export default AdminInfo;
