"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact, formatCurrency } from "@/lib/utils";

const PIE_COLORS = [
  "#1E40AF", "#F59E0B", "#16A34A", "#DC2626",
  "#7C3AED", "#0891B2", "#D97706", "#374151",
];

interface CategoryDatum {
  name: string;
  value: number;
}

interface ProjectFinancialDatum {
  name: string;
  committed: number;
  revenue: number;
  remaining: number;
}

function CustomTooltip({
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
      <p className="font-semibold text-gray-300 mb-1">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ background: item.color }} />
          <span className="text-gray-400">{item.name}:</span>
          <span className="font-mono">{currencySymbol}{formatCompact(item.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function ProjectFinancialChart({
  data,
  currencySymbol,
}: {
  data: ProjectFinancialDatum[];
  currencySymbol: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `${currencySymbol}${formatCompact(value)}`}
        />
        <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
        <Bar dataKey="revenue" name="Revenue" fill="#1E40AF" radius={[3, 3, 0, 0]} />
        <Bar dataKey="committed" name="Committed" fill="#F59E0B" radius={[3, 3, 0, 0]} />
        <Bar dataKey="remaining" name="Remaining" fill="#E5E7EB" radius={[3, 3, 0, 0]} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12, color: "#9CA3AF" }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SpendCategoryChart({
  data,
  currencySymbol,
}: {
  data: CategoryDatum[];
  currencySymbol: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `${currencySymbol}${formatCompact(value)}`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: "#6B7280" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
        <Bar dataKey="value" name="Spent" radius={[0, 3, 3, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SpendDistributionChart({
  data,
  currencySymbol,
}: {
  data: CategoryDatum[];
  currencySymbol: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          dataKey="value"
          nameKey="name"
          paddingAngle={3}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value, currencySymbol)} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#6B7280" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
