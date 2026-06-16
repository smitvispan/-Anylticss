"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
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

export default function DateRangeForm({ initialStart, initialEnd, autoApply = true }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showQuickRanges, setShowQuickRanges] = useState(false);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [isApplying, setIsApplying] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const applyQuickRange = (days?: number, months?: number) => {
    const endDate = new Date();
    let startDate = new Date();

    if (days) {
      startDate.setDate(endDate.getDate() - days + 1);
    } else if (months !== undefined) {
      if (months === 0) {
        // This month
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      } else if (months === -1) {
        // Last month
        endDate.setMonth(endDate.getMonth() - 1);
        endDate.setDate(0); // Last day of previous month
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      }
    }

    const newStart = getDateString(startDate);
    const newEnd = getDateString(endDate);
    
    setStart(newStart);
    setEnd(newEnd);
    commit(newStart, newEnd);
    setShowQuickRanges(false);
  };

  const commit = useCallback(
    async (nextStart: string, nextEnd: string) => {
      setIsApplying(true);
      
      // Small delay to show loading animation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("start", nextStart);
      params.set("end", nextEnd);
      router.push(`${pathname}?${params.toString()}`);
      
      // Reset loading state after navigation
      setTimeout(() => {
        setIsApplying(false);
      }, 300);
    },
    [pathname, router, searchParams]
  );

  const onChangeStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setStart(v);
    if (autoApply && v && end) commit(v, end);
  };

  const onChangeEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setEnd(v);
    if (autoApply && start && v) commit(start, v);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (start && end) {
      setIsApplying(true);
      await commit(start, end);
    }
  };

  // Close dropdown when clicking outside
  useState(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowQuickRanges(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  });

  return (
    <div className="space-y-4">
      {/* All in one horizontal form */}
      <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          {/* Quick Ranges Dropdown */}
          <div className="relative" ref={dropdownRef}>
            {/* <button
              type="button"
              onClick={() => setShowQuickRanges(!showQuickRanges)}
              className="inline-flex items-center gap-2 px-4 py-3 h-[42px] text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Calendar className="h-4 w-4" />
              Quick Ranges
              <ChevronDown className={`h-4 w-4 transition-transform ${showQuickRanges ? 'rotate-180' : ''}`} />
            </button> */}
            
            {showQuickRanges && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[100] overflow-visible">
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
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            {/* Apply Button */}
            <div>
              <Button
                type="submit"
                disabled={isApplying}
                className="h-[42px] px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all hover:shadow-lg disabled:opacity-90 disabled:cursor-not-allowed"
              >
                {isApplying ? (
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

        {/* Selected Range and Reset - Horizontal */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Selected:
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {new Date(start).toLocaleDateString()} – {new Date(end).toLocaleDateString()}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const lastWeek = new Date();
                lastWeek.setDate(today.getDate() - 7);
                const newStart = getDateString(lastWeek);
                const newEnd = getDateString(today);
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
      </form>
    </div>
  );
}