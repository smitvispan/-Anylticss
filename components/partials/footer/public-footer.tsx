import React from "react";
import FooterContent from "./footer-content";
import { Link } from "@/components/navigation";

const PublicFooter = () => {
  return (
    <FooterContent>
      <div className="hidden items-center justify-between text-sm text-slate-700 md:flex">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            Analytics workspace
          </span>
          <span className="hidden sm:inline-block">
            Insights that keep your campaigns on track · {new Date().getFullYear()}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-slate-700 font-semibold hover:text-sky-700"
          >
            Home
          </Link>
          <a
            href="https://vispansolutions.com/"
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow-sm shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700"
          >
            Contact support
          </a>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-700 md:hidden">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          <span>Analytics hub</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold text-slate-800">
            Home
          </Link>
          <a
            href="https://vispansolutions.com/"
            target="_blank"
            rel="noreferrer"
            className="text-slate-700"
          >
            Help
          </a>
        </div>
      </div>
    </FooterContent>
  );
};

export default PublicFooter;
