"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DeptAttendanceItem, HeadcountTrendItem } from "@/lib/types";

const EMPLOYMENT_TYPE_COLORS = ["#0D9488", "#2563EB", "#EA580C"];

export function HeadcountTrendChart({ data }: { data: HeadcountTrendItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
          formatter={(value: number) => [value, "Karyawan"]}
        />
        <Line
          dataKey="count" name="Karyawan" stroke="#0D9488" strokeWidth={2.5}
          dot={{ fill: "#0D9488", r: 3 }} activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DepartmentAttendanceChart({ data }: { data: DeptAttendanceItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
        <XAxis
          type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#9CA3AF" }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          type="category" dataKey="dept" tick={{ fontSize: 11, fill: "#6B7280" }}
          axisLine={false} tickLine={false} width={90}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
          formatter={(value: number) => [`${value.toFixed(1)}%`, "Kehadiran"]}
        />
        <Bar
          dataKey="rate_pct" name="Kehadiran %" radius={[0, 3, 3, 0]} fill="#0D9488"
          label={{
            position: "right",
            fontSize: 10,
            fill: "#6B7280",
            formatter: (value: number) => `${value.toFixed(0)}%`,
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EmploymentTypeChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
          dataKey="value" nameKey="name" paddingAngle={4}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={EMPLOYMENT_TYPE_COLORS[index % EMPLOYMENT_TYPE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number, name: string) => [value, name]} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#6B7280" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
