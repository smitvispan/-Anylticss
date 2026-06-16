"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, RefreshCw, Check } from "lucide-react";
import { useState } from "react";

interface DateRangeFormProps {
  initialStart: string;
  initialEnd: string;
  autoApply?: boolean;
  campaignFilter?: string;
  adsetFilter?: string;
}

export default function DateRangeForm({
  initialStart,
  initialEnd,
  autoApply = false,
  campaignFilter,
  adsetFilter,
}: DateRangeFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      start: initialStart,
      end: initialEnd,
      campaign: campaignFilter || "",
      adset: adsetFilter || "",
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setShowSuccess(false);

    try {
      // Simulate a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const params = new URLSearchParams();

      Object.entries(data).forEach(([key, value]) => {
        if (value && value !== "") {
          params.set(key, value.toString());
        }
      });

      router.push(`?${params.toString()}`);
      
      // Show success state briefly
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsLoading(false);
      }, 1500);
      
    } catch (error) {
      setIsLoading(false);
      setShowSuccess(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card className="border-border/40 bg-card shadow-sm group hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Calendar className="h-4 w-4 text-primary group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Date Range</CardTitle>
            <p className="text-xs text-muted-foreground">
              {formatDate(initialStart)} - {formatDate(initialEnd)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Start Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  {...register("start")}
                  className="h-10 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-primary/50 focus:border-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                End Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  {...register("end")}
                  className="h-10 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-primary/50 focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Hidden fields for filters */}
          {campaignFilter && (
            <input type="hidden" {...register("campaign")} />
          )}
          {adsetFilter && <input type="hidden" {...register("adset")} />}

          <Button
            type="submit"
            className={`w-full h-10 font-medium transition-all duration-300 ${
              showSuccess
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
            } relative overflow-hidden group/btn`}
            disabled={isLoading || isSubmitting}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
            
            <div className="flex items-center justify-center gap-2 relative z-10">
              {isLoading || isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Filtering...</span>
                </>
              ) : showSuccess ? (
                <>
                  <Check className="h-4 w-4 animate-in zoom-in duration-300" />
                  <span>Applied Successfully!</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 group-hover/btn:rotate-180 transition-transform duration-500" />
                  <span>Apply Date Range</span>
                </>
              )}
            </div>
          </Button>
          
          <div className="text-xs text-muted-foreground text-center animate-pulse">
            {isLoading ? "Updating metrics..." : "Date range will update all metrics"}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}