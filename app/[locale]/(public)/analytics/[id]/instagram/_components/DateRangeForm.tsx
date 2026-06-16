"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown, Loader2 } from "lucide-react";

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

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toDateInputValue = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const isValidDateInputValue = (value: string) => {
  if (!DATE_INPUT_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

const formatDisplayDate = (value: string) => {
  if (!isValidDateInputValue(value)) return "Select date";

  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
};

export default function DateRangeForm({ initialStart, initialEnd, autoApply = true }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showQuickRanges, setShowQuickRanges] = useState(false);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [isPending, startTransition] = useTransition();

  const dropdownRef = useRef<HTMLDivElement>(null);

  const maxEndDate = useMemo(() => toDateInputValue(new Date()), []);

  const getValidationError = useCallback(
    (nextStart: string, nextEnd: string) => {
      if (!nextStart || !nextEnd) return "Select both start and end dates.";
      if (!isValidDateInputValue(nextStart) || !isValidDateInputValue(nextEnd)) {
        return "Enter a valid date range.";
      }
      if (nextStart > nextEnd) return "Start date cannot be after end date.";
      if (nextEnd > maxEndDate) return "End date cannot be in the future.";
      return null;
    },
    [maxEndDate]
  );

  const validationError = useMemo(
    () => getValidationError(start, end),
    [end, getValidationError, start]
  );

  const commit = useCallback(
    (nextStart: string, nextEnd: string) => {
      if (getValidationError(nextStart, nextEnd)) return;

      setStart(nextStart);
      setEnd(nextEnd);

      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("start", nextStart);
      params.set("end", nextEnd);

      const currentStart = searchParams?.get("start") ?? "";
      const currentEnd = searchParams?.get("end") ?? "";

      startTransition(() => {
        if (currentStart === nextStart && currentEnd === nextEnd) {
          router.refresh();
          return;
        }

        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [getValidationError, pathname, router, searchParams]
  );

  const applyQuickRange = (days?: number, months?: number) => {
    const endDate = new Date();
    let startDate = new Date();

    if (days) {
      startDate.setDate(endDate.getDate() - days + 1);
    } else if (months !== undefined) {
      if (months === 0) {
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      } else if (months === -1) {
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
        endDate.setDate(0);
      }
    }

    const newStart = toDateInputValue(startDate);
    const newEnd = toDateInputValue(endDate);

    setStart(newStart);
    setEnd(newEnd);
    if (autoApply) commit(newStart, newEnd);
    setShowQuickRanges(false);
  };

  const onChangeStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setStart(v);
    if (autoApply && !getValidationError(v, end)) commit(v, end);
  };

  const onChangeEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setEnd(v);
    if (autoApply && !getValidationError(start, v)) commit(start, v);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    commit(start, end);
  };

  useEffect(() => {
    setStart(initialStart);
    setEnd(initialEnd);
  }, [initialEnd, initialStart]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowQuickRanges(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowQuickRanges(!showQuickRanges)}
              aria-expanded={showQuickRanges}
              aria-haspopup="menu"
              className="inline-flex items-center gap-2 px-4 py-3 h-[42px] text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Calendar className="h-4 w-4" />
              Quick Ranges
              <ChevronDown className={`h-4 w-4 transition-transform ${showQuickRanges ? 'rotate-180' : ''}`} />
            </button>
            
            {showQuickRanges && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[100] overflow-hidden">
                {QUICK_RANGES.map((range) => (
                  <button
                    key={range.label}
                    type="button"
                    onClick={() => applyQuickRange(range.days, range.months)}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors"
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Inputs */}
          <div className="flex-1 flex flex-col md:flex-row items-start md:items-end gap-4">
            {/* Start Date */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="start"
                  value={start}
                  onChange={onChangeStart}
                  max={end || maxEndDate}
                  aria-invalid={Boolean(validationError)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div className="hidden md:block pb-2.5">
              <span className="text-gray-500 dark:text-gray-400">to</span>
            </div>

            {/* End Date */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="end"
                  value={end}
                  onChange={onChangeEnd}
                  min={start || undefined}
                  max={maxEndDate}
                  aria-invalid={Boolean(validationError)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            {/* Apply Button */}
            <div>
              <Button
                type="submit"
                disabled={isPending || Boolean(validationError)}
                className="h-[42px] px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all hover:shadow-lg disabled:opacity-90 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Applying...
                  </span>
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Selected:
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {validationError ? "Choose a valid range" : `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const lastWeek = new Date();
                lastWeek.setDate(today.getDate() - 6);
                const newStart = toDateInputValue(lastWeek);
                const newEnd = toDateInputValue(today);
                setStart(newStart);
                setEnd(newEnd);
                if (autoApply) commit(newStart, newEnd);
              }}
              className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
            >
              Reset
            </button>
          </div>
        </div>
        {validationError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {validationError}
          </p>
        )}
      </form>
    </div>
  );
}
