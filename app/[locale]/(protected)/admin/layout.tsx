import { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Admin - Vispan Solutions",
  description: "Admin for Vispan Solutions dashboard",
};
const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      {children}
    </>
  );
};

export default Layout;
