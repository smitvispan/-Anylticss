"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition } from "react";

type ReportAccountOption = {
  id: string;
  label: string;
};

type ReportAccountSwitcherProps = {
  label: string;
  paramKey: string;
  value: string;
  options: ReportAccountOption[];
  clearParamKeys?: string[];
};

export default function ReportAccountSwitcher({
  label,
  paramKey,
  value,
  options,
  clearParamKeys = [],
}: ReportAccountSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (options.length <= 1) {
    return null;
  }

  return (
    <div className="w-full max-w-sm">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams?.toString() || "");
          params.set(paramKey, event.target.value);
          clearParamKeys.forEach((key) => params.delete(key));
          startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
          });
        }}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
