"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Props = {
  values: number[];
  color: string;
  height?: number;
  type?: "area" | "bar" | "line";
};

export default function MetricSparkline({
  values,
  color,
  height = 54,
  type = "area",
}: Props) {
  const { theme } = useTheme();

  const cleanValues = (values?.length ? values : [0]).map((v) =>
    Number.isFinite(v) ? v : 0
  );

  const options: any = {
    chart: {
      sparkline: { enabled: true },
      toolbar: { show: false },
      animations: { enabled: true },
    },
    dataLabels: { enabled: false },
    stroke: { width: type === "bar" ? 0 : 2, curve: "smooth" },
    fill: { opacity: type === "line" ? 0 : 0.25 },
    colors: [color],
    tooltip: { theme: theme === "dark" ? "dark" : "light" },
    grid: { show: false, padding: { left: 0, right: 0 } },
    markers: { size: 0 },
    xaxis: {
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: { show: false },
    legend: { show: false },
  };

  return (
    <div className="mt-3">
      <Chart
        options={options}
        series={[{ data: cleanValues }]}
        type={type}
        height={height}
        width="100%"
      />
    </div>
  );
}
