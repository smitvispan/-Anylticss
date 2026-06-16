import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin - Vispan Solutions",
  description: "Admin for Vispan Solutions dashboard",
};
const Layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Layout;
