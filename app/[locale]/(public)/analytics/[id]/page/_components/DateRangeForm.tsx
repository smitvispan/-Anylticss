"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown, Check, Loader2 } from "lucide-react";

type Props = {
  initialStart: string;
  initialEnd: string;
  autoApply?: boolean;
};

const QUICK_RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This month", months: 0 },
  { label: "Last month", months: -1 },
];

const toDateInputValue = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export default function DateRangeForm({ initialStart, initialEnd, autoApply = true }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showQuickRanges, setShowQuickRanges] = useState(false);
  const [isPending, startTransition] = useTransition();

  const formRef = useRef<HTMLFormElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const maxEndDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toDateInputValue(d);
  }, []);

  const normalizeRange = useCallback(
    (nextStart: string, nextEnd: string) => {
      let normalizedEnd = nextEnd;
      if (normalizedEnd && normalizedEnd > maxEndDate) normalizedEnd = maxEndDate;

      let normalizedStart = nextStart;
      if (normalizedStart && normalizedEnd && normalizedStart > normalizedEnd) {
        normalizedStart = normalizedEnd;
      }

      return { start: normalizedStart, end: normalizedEnd };
    },
    [maxEndDate]
  );

  const normalizedInitial = useMemo(
    () => normalizeRange(initialStart, initialEnd),
    [initialEnd, initialStart, normalizeRange]
  );

  const [start, setStart] = useState(normalizedInitial.start);
  const [end, setEnd] = useState(normalizedInitial.end);

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  useEffect(() => {
    const normalized = normalizeRange(initialStart, initialEnd);
    setStart(normalized.start);
    setEnd(normalized.end);
  }, [initialEnd, initialStart, normalizeRange]);

  const applyQuickRange = (days?: number, months?: number) => {
    const endDate = new Date();
    let startDate = new Date();

    if (days) {
      startDate.setDate(endDate.getDate() - days + 1);
    } else if (months !== undefined) {
      if (months === 0) {
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      } else if (months === -1) {
        endDate.setMonth(endDate.getMonth() - 1);
        endDate.setDate(0);
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      }
    }

    const newStart = toDateInputValue(startDate);
    const newEnd = toDateInputValue(endDate);
    const normalized = normalizeRange(newStart, newEnd);
    
    setStart(normalized.start);
    setEnd(normalized.end);
    if (autoApply && normalized.start && normalized.end) commit(normalized.start, normalized.end);
    setShowQuickRanges(false);
  };

  const commit = useCallback(
    (nextStart: string, nextEnd: string) => {
      const normalized = normalizeRange(nextStart, nextEnd);
      if (!normalized.start || !normalized.end) return;

      setStart(normalized.start);
      setEnd(normalized.end);

      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("start", normalized.start);
      params.set("end", normalized.end);

      const currentStart = searchParams?.get("start") ?? "";
      const currentEnd = searchParams?.get("end") ?? "";

      startTransition(() => {
        if (currentStart === normalized.start && currentEnd === normalized.end) {
          router.refresh();
          return;
        }
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [normalizeRange, pathname, router, searchParams, startTransition]
  );

  const onChangeStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (!autoApply) {
      const normalized = normalizeRange(v, end);
      setStart(normalized.start);
      setEnd(normalized.end);
      return;
    }
    if (v && end) commit(v, end);
  };

  const onChangeEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (!autoApply) {
      const normalized = normalizeRange(start, v);
      setStart(normalized.start);
      setEnd(normalized.end);
      return;
    }
    if (start && v) commit(start, v);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (start && end) {
      commit(start, end);
    }
  };

  return (
    <div className="space-y-4">
      <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-col lg:flex-row items-start gap-4">
          {/* Quick Ranges */}
          <div className="relative w-full lg:w-auto" ref={dropdownRef}>
            {/* <button
              type="button"
              onClick={() => setShowQuickRanges(!showQuickRanges)}
              className="inline-flex items-center justify-between gap-2 px-4 py-3 h-[42px] w-full lg:w-auto text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Quick Ranges</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showQuickRanges ? 'rotate-180' : ''}`} />
            </button> */}
            
            {showQuickRanges && (
              <div className="absolute top-full left-0 mt-2 w-full lg:w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {QUICK_RANGES.map((range) => (
                  <button
                    key={range.label}
                    type="button"
                    onClick={() => applyQuickRange(range.days, range.months)}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-between group"
                  >
                    <span>{range.label}</span>
                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Inputs and Apply Button - Horizontal on desktop, vertical on mobile */}
          <div className="flex-1 w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Start Date */}
              <div>
                {/* <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label> */}
                <div className="relative">
                  <input
                    type="date"
                    name="start"
                    value={start}
                    onChange={onChangeStart}
                    max={end || maxEndDate}
                    disabled={isPending}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                  />
                  {/* <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div> */}
                </div>
              </div>

              {/* End Date */}
              <div>
                {/* <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label> */}
                <div className="relative">
                  <input
                    type="date"
                    name="end"
                    value={end}
                    onChange={onChangeEnd}
                    min={start || undefined}
                    max={maxEndDate}
                    disabled={isPending}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                  />
                  {/* <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div> */}
                </div>
              </div>

              {/* Apply Button */}
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-[42px] w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-90 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2 animate-pulse">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Applying...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Check className="h-4 w-4" />
                      Apply
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Range Display and Reset - Always in a row */}
        {/* <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Selected Range
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDisplayDate(start)} – {formatDisplayDate(end)}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const lastWeek = new Date();
                lastWeek.setDate(today.getDate() - 6);
                const newStart = getDateString(lastWeek);
                const newEnd = getDateString(today);
                setStart(newStart);
                setEnd(newEnd);
                if (autoApply) commit(newStart, newEnd);
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg whitespace-nowrap"
            >
              Reset to Last 7 Days
            </button>
          </div>
        </div> */}
      </form>
    </div>
  );
}
