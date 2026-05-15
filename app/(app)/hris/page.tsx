"use client";
import { useQuery } from "@tanstack/react-query";
import { Users, Fingerprint, CalendarDays, HeartPulse } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { hrisEmployeesApi, hrisDepartmentsApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TIPE_COLORS_PIE = ["#0D9488", "#2563EB", "#EA580C"];
const DEPT_BAR_COLOR = "#0D9488";

export default function HrisDashboardPage() {
  const { data: empData, isLoading: empLoad } = useQuery({
    queryKey: ["hris", "employees", { limit: 500 }],
    queryFn: () => hrisEmployeesApi.list({ limit: 500 }).then((r) => r.data),
  });
  const { data: depts = [] } = useQuery({
    queryKey: ["hris", "departments"],
    queryFn: () => hrisDepartmentsApi.list().then((r) => r.data),
  });

  const employees = empData?.items ?? [];
  const total      = empData?.total ?? 0;

  const active    = employees.filter((e) => e.status === "active").length;
  const probation = employees.filter((e) => e.status === "probation").length;
  const tetap     = employees.filter((e) => e.tipe === "Tetap").length;
  const pkwt      = employees.filter((e) => e.tipe === "PKWT").length;
  const outsource = employees.filter((e) => e.tipe === "Outsource").length;

  const tipeData = [
    { name: "Tetap",     value: tetap },
    { name: "PKWT",      value: pkwt },
    { name: "Outsource", value: outsource },
  ].filter((d) => d.value > 0);

  // Headcount by dept
  const deptMap: Record<string, number> = {};
  employees.forEach((e) => {
    const dname = e.department?.name ?? "No Dept";
    deptMap[dname] = (deptMap[dname] ?? 0) + 1;
  });
  const deptData = Object.entries(deptMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const quickLinks = [
    { href: "/hris/employees",  label: "Data Karyawan",    icon: Users,        color: "teal" },
    { href: "/hris/attendance", label: "Absensi & Lembur", icon: Fingerprint,  color: "purple" },
    { href: "/hris/leave",      label: "Cuti & Izin",      icon: CalendarDays, color: "blue" },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">HRIS Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Human Resource Information System · Ringkasan SDM</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Karyawan",   value: total,      color: "text-gray-900",   loading: empLoad },
          { label: "Karyawan Aktif",   value: active,     color: "text-teal-600",   loading: empLoad },
          { label: "Probasi",          value: probation,  color: "text-amber-600",  loading: empLoad },
          { label: "Departemen",       value: depts.length, color: "text-blue-600", loading: false },
        ].map((kpi) => (
          <Card key={kpi.label} className="text-center">
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">{kpi.label}</p>
            {kpi.loading
              ? <Skeleton className="h-8 w-16 mx-auto mt-2" />
              : <p className={`num text-2xl font-bold mt-2 ${kpi.color}`}>{kpi.value}</p>
            }
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Headcount by dept */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Headcount per Departemen</h3>
          </div>
          <div className="p-5">
            {empLoad ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deptData} layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={false} tickLine={false} width={90} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
                    formatter={(v: number) => [v, "Karyawan"]}
                  />
                  <Bar dataKey="count" name="Karyawan" fill={DEPT_BAR_COLOR} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Employment type mix */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Komposisi Tipe Karyawan</h3>
          </div>
          <div className="p-5 flex items-center justify-center">
            {empLoad ? <Skeleton className="h-48 w-full" /> : tipeData.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada data karyawan</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={tipeData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={80}
                    dataKey="value" nameKey="name"
                    paddingAngle={4}
                  >
                    {tipeData.map((_, i) => (
                      <Cell key={i} fill={TIPE_COLORS_PIE[i % TIPE_COLORS_PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [v, name]} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#6B7280" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickLinks.map(({ href, label, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-sm",
              color === "teal"   ? "border-teal-100 bg-teal-50 hover:border-teal-200"   :
              color === "purple" ? "border-purple-100 bg-purple-50 hover:border-purple-200" :
              "border-blue-100 bg-blue-50 hover:border-blue-200"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              color === "teal"   ? "bg-teal-100"   :
              color === "purple" ? "bg-purple-100" : "bg-blue-100"
            )}>
              <Icon size={18} className={
                color === "teal"   ? "text-teal-700"   :
                color === "purple" ? "text-purple-700" : "text-blue-700"
              } />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">Buka modul →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

