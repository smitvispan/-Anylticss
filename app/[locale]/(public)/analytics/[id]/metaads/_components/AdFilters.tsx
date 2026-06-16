"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  campaigns?: string[];
  adsets?: string[];
  start?: string;
  end?: string;
  campaign?: string;
  adset?: string;
  ranges?: Array<{ start: string; end: string }>;
};

export default function AdFilters({
  campaigns = [],
  adsets = [],
  start = "",
  end = "",
  campaign = "",
  adset = "",
  ranges = [],
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const updateQuery = useCallback(
    (key: "campaign" | "adset" | "range", value: string) => {
      const params = new URLSearchParams(sp?.toString() || "");

      if (key === "range") {
        const [s, e] = value.split("|");
        if (s && e) {
          params.set("start", s);
          params.set("end", e);
        }
      } else {
        if (value && value !== "__all__") {
          params.set(key, value);
        } else {
          params.delete(key);
        }

        if (start) params.set("start", start);
        if (end) params.set("end", end);
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, sp, start, end]
  );

  return (
    <Card className="border-border/40 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Filter className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Filters</CardTitle>
            <p className="text-xs text-muted-foreground">
              Filter by date range, campaign, and ad set
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campaign Filter */}
        {/* <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Date Range
          </label>
          <Select
            defaultValue={ranges.length ? `${start}|${end}` : "__current__"}
            onValueChange={(v) => updateQuery("range", v)}
          >
            <SelectTrigger className="h-10 w-full border-border/60 bg-background hover:bg-accent/50 transition-colors">
              <SelectValue placeholder="Current Range" />
            </SelectTrigger>
            <SelectContent className="border-border/60 bg-background">
              <SelectItem value="__current__" className="focus:bg-accent/50">
                Current Range
              </SelectItem>
              {ranges.map((r) => {
                const label = `${r.start} → ${r.end}`;
                return (
                  <SelectItem
                    key={`${r.start}|${r.end}`}
                    value={`${r.start}|${r.end}`}
                    className="focus:bg-accent/50 transition-colors"
                  >
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div> */}

        {/* Campaign Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Campaign
          </label>
          <Select
            defaultValue={campaign || "__all__"}
            onValueChange={(v) => updateQuery("campaign", v)}
          >
            <SelectTrigger className="h-10 w-full border-border/60 bg-background hover:bg-accent/50 transition-colors">
              <SelectValue placeholder="All Campaigns" />
            </SelectTrigger>
            <SelectContent className="border-border/60 bg-background">
              <SelectItem value="__all__" className="focus:bg-accent/50">
                All Campaigns
              </SelectItem>
              {campaigns.map((c) => (
                <SelectItem
                  key={c}
                  value={c}
                  className="focus:bg-accent/50 transition-colors"
                >
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ad Set Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Ad Set</label>
          <Select
            defaultValue={adset || "__all__"}
            onValueChange={(v) => updateQuery("adset", v)}
          >
            <SelectTrigger className="h-10 w-full border-border/60 bg-background hover:bg-accent/50 transition-colors">
              <SelectValue placeholder="All Ad Sets" />
            </SelectTrigger>
            <SelectContent className="border-border/60 bg-background">
              <SelectItem value="__all__" className="focus:bg-accent/50">
                All Ad Sets
              </SelectItem>
              {adsets.map((a) => (
                <SelectItem
                  key={a}
                  value={a}
                  className="focus:bg-accent/50 transition-colors"
                >
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-2">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">{campaigns.length}</span> campaigns •{" "}
            <span className="font-medium">{adsets.length}</span> ad sets
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
