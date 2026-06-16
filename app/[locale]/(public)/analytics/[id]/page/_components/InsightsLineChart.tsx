"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type DataPoint = { label: string; value: number };

type Props = {
  title: string;
  data: DataPoint[];
  color?: string;
  seriesName?: string;
};

export default function InsightsLineChart({
  title,
  data,
  color = "#6366f1",
  seriesName = "Series",
}: Props) {
  const { theme } = useTheme();

  const safeData = (data?.length ? data : [{ label: "", value: 0 }]).map((d) => ({
    label: d.label || "",
    value: Number.isFinite(d.value) ? d.value : 0,
  }));

  const options: any = {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: {
      width: 3,
      curve: "smooth",
    },
    dataLabels: {
      enabled: true,
      background: {
        enabled: true,
        borderRadius: 4,
        padding: 4,
      },
      style: {
        fontSize: "11px",
      },
    },
    markers: {
      size: 4,
      strokeWidth: 2,
      strokeColors: color,
      colors: "#fff",
    },
    colors: [color],
    tooltip: { theme: theme === "dark" ? "dark" : "light" },
    xaxis: {
      categories: safeData.map((d) => d.label),
      labels: {
        show: true,
        rotate: 0,
      },
      tooltip: { enabled: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => Math.round(val).toLocaleString(),
      },
    },
    grid: {
      borderColor: theme === "dark" ? "#1f2937" : "#e5e7eb",
      strokeDashArray: 3,
    },
    legend: { show: false },
  };

  return (
    <div>
      <div className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
        {title}
      </div>
      <Chart
        options={options}
        series={[
          {
            name: seriesName,
            data: safeData.map((d) => d.value),
          },
        ]}
        type="line"
        height={280}
        width="100%"
      />
    </div>
  );
}
