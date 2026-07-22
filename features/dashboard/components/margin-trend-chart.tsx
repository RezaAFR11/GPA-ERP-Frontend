"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface MarginTrendDatum {
  month: string;
  revenue: number;
  spent: number;
  margin: number;
}

interface MarginTrendChartProps {
  data: MarginTrendDatum[];
  currencySymbol: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  currencySymbol,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  currencySymbol: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-xs text-white shadow-lg">
      <p className="font-semibold text-gray-300 mb-1.5">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
          <span className="text-gray-400 capitalize">{item.name}:</span>
          <span className="font-mono font-medium">
            {item.name === "margin" ? `${item.value}%` : `${currencySymbol}${item.value}M`}
          </span>
        </p>
      ))}
    </div>
  );
}

export default function MarginTrendChart({ data, currencySymbol }: MarginTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
        <YAxis
          yAxisId="pct"
          orientation="right"
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `${value}%`}
          domain={[0, 100]}
        />
        <YAxis
          yAxisId="money"
          orientation="left"
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `${currencySymbol}${value}M`}
        />
        <Tooltip content={<ChartTooltip currencySymbol={currencySymbol} />} />
        <Line
          yAxisId="money" type="monotone" dataKey="revenue"
          stroke="#1E40AF" strokeWidth={2} dot={{ r: 3, fill: "#1E40AF" }} activeDot={{ r: 5 }}
        />
        <Line
          yAxisId="money" type="monotone" dataKey="spent"
          stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: "#F59E0B" }}
          activeDot={{ r: 5 }} strokeDasharray="5 3"
        />
        <Line
          yAxisId="pct" type="monotone" dataKey="margin"
          stroke="#16A34A" strokeWidth={2} dot={{ r: 3, fill: "#16A34A" }} activeDot={{ r: 5 }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12, color: "#9CA3AF" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
