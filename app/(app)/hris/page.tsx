"use client";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Fingerprint, CalendarDays, AlertTriangle, UserCheck,
  TrendingUp, TrendingDown, Clock, Banknote,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { hrisDashboardApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn, fmtDate } from "@/lib/utils";

const TIPE_COLORS_PIE = ["#0D9488", "#2563EB", "#EA580C"];

export default function HrisDashboardPage() {
  const now = new Date();
  const { canAccessMenu } = useAuth();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["hris", "dashboard", "stats", now.getFullYear(), now.getMonth() + 1],
    queryFn: () => hrisDashboardApi.getStats(now.getFullYear(), now.getMonth() + 1).then((r) => r.data),
  });

  const tipeData  = [
    { name: "Tetap",     value: stats?.employment_type_counts.Tetap ?? 0     },
    { name: "PKWT",      value: stats?.employment_type_counts.PKWT ?? 0      },
    { name: "Outsource", value: stats?.employment_type_counts.Outsource ?? 0 },
  ].filter((d) => d.value > 0);

  const quickLinks = [
    { href: "/hris/employees",  menuKey: "hris_employees",  label: "Data Karyawan",    icon: Users,        color: "teal"   },
    { href: "/hris/attendance", menuKey: "hris_attendance", label: "Absensi & Lembur", icon: Fingerprint,  color: "purple" },
    { href: "/hris/leave",      menuKey: "hris_leave",      label: "Cuti & Izin",      icon: CalendarDays, color: "blue"   },
  ].filter((item) => canAccessMenu(item.menuKey));

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">HRIS Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Human Resource Information System · Ringkasan SDM</p>
      </div>

      {/* KPI Row — 6 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Total Karyawan", value: stats?.total_employees, color: "text-gray-900" },
          { label: "Aktif",          value: stats?.active,          color: "text-teal-600" },
          { label: "Probasi",        value: stats?.probation,       color: "text-amber-600" },
          { label: "Hired YTD",      value: stats?.hired_ytd,       color: "text-blue-600" },
          { label: "Resigned YTD",   value: stats?.terminated_ytd,  color: "text-red-500"  },
          {
            label: "PKWT Expiring 90d",
            value: stats?.pkwt_expiring_90d,
            color: (stats?.pkwt_expiring_90d ?? 0) > 0 ? "text-red-600" : "text-gray-500",
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="text-center">
            <p className="text-[10px] font-semibold tracking-wide text-gray-400 uppercase leading-tight">{kpi.label}</p>
            {isLoading
              ? <Skeleton className="h-7 w-12 mx-auto mt-2" />
              : <p className={cn("num text-2xl font-bold mt-1.5", kpi.color)}>{kpi.value ?? "—"}</p>
            }
          </Card>
        ))}
      </div>

      {/* Headcount trend + PKWT expiry */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Headcount trend line chart */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Tren Headcount (6 Bulan)</h3>
          </div>
          <div className="p-5">
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats?.headcount_trend ?? []}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
                    formatter={(v: number) => [v, "Karyawan"]}
                  />
                  <Line dataKey="count" name="Karyawan" stroke="#0D9488" strokeWidth={2.5}
                    dot={{ fill: "#0D9488", r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Leave liability + PKWT expiry */}
        <div className="space-y-4">
          {/* Leave liability KPI */}
          <Card className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Banknote size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Sisa Cuti Akumulatif</p>
              {isLoading
                ? <Skeleton className="h-7 w-24 mt-1" />
                : <p className="text-2xl font-bold text-blue-700 num">
                    {stats?.leave_liability_days ?? 0}
                    <span className="text-sm font-normal text-gray-400 ml-1">hari</span>
                  </p>
              }
            </div>
          </Card>

          {/* Attendance rate */}
          <Card className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <UserCheck size={18} className="text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Tingkat Kehadiran Bulan Ini</p>
              {isLoading
                ? <Skeleton className="h-7 w-20 mt-1" />
                : <p className={cn("text-2xl font-bold num",
                    (stats?.attendance_rate_pct ?? 0) >= 85 ? "text-teal-700" : "text-amber-600")}>
                    {(stats?.attendance_rate_pct ?? 0).toFixed(1)}%
                  </p>
              }
            </div>
          </Card>

          {/* PKWT expiry breakdown */}
          <Card>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">PKWT Akan Berakhir</p>
            <div className="flex gap-4 text-center">
              {[
                { label: "30 hari", value: stats?.pkwt_expiring_30d ?? 0, color: "text-red-600" },
                { label: "60 hari", value: stats?.pkwt_expiring_60d ?? 0, color: "text-orange-600" },
                { label: "90 hari", value: stats?.pkwt_expiring_90d ?? 0, color: "text-amber-600" },
              ].map(item => (
                <div key={item.label} className="flex-1">
                  {isLoading
                    ? <Skeleton className="h-6 w-10 mx-auto mb-1" />
                    : <p className={cn("text-xl font-bold num", item.color)}>{item.value}</p>
                  }
                  <p className="text-[10px] text-gray-400">{item.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* PKWT Expiry Table (shown only if alerts exist) */}
      {(stats?.pkwt_expiring_90d ?? 0) > 0 && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">Kontrak PKWT Akan Berakhir (Top 10)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase">
                  <th className="text-left px-5 py-2 font-medium">No. Karyawan</th>
                  <th className="text-left px-5 py-2 font-medium">Nama</th>
                  <th className="text-right px-5 py-2 font-medium">Tgl Berakhir</th>
                  <th className="text-right px-5 py-2 font-medium">Sisa Hari</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(stats?.pkwt_expiring_list ?? []).map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-5 py-2.5 font-mono text-xs text-gray-500">{emp.employee_no}</td>
                    <td className="px-5 py-2.5 font-medium text-gray-800">{emp.full_name}</td>
                    <td className="px-5 py-2.5 text-right text-gray-600">{fmtDate(emp.end_date)}</td>
                    <td className="px-5 py-2.5 text-right">
                      <Badge className={cn("text-[10px]",
                        emp.days_left <= 30 ? "bg-red-50 text-red-700 border-red-200" :
                        emp.days_left <= 60 ? "bg-orange-50 text-orange-700 border-orange-200" :
                                                    "bg-amber-50 text-amber-700 border-amber-200")}>
                        {emp.days_left} hari
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Attendance rate by dept */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Kehadiran per Departemen (%)</h3>
          </div>
          <div className="p-5">
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={Math.max(160, (stats?.dept_attendance?.length ?? 0) * 28)}>
                <BarChart
                  data={stats?.dept_attendance ?? []}
                  layout="vertical"
                  margin={{ top: 0, right: 32, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="dept" tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={false} tickLine={false} width={90} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
                    formatter={(v: number) => [`${v.toFixed(1)}%`, "Kehadiran"]}
                  />
                  <Bar dataKey="rate_pct" name="Kehadiran %" radius={[0, 3, 3, 0]}
                    fill="#0D9488"
                    label={{ position: "right", fontSize: 10, fill: "#6B7280", formatter: (v: number) => `${v.toFixed(0)}%` }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Employment type pie */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Komposisi Tipe Karyawan</h3>
          </div>
          <div className="p-5 flex items-center justify-center">
            {isLoading ? <Skeleton className="h-48 w-full" /> : tipeData.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada data karyawan</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={tipeData} cx="50%" cy="50%"
                    innerRadius={55} outerRadius={80}
                    dataKey="value" nameKey="name" paddingAngle={4}>
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
          <Link key={href} href={href}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-sm",
              color === "teal"   ? "border-teal-100 bg-teal-50 hover:border-teal-200"       :
              color === "purple" ? "border-purple-100 bg-purple-50 hover:border-purple-200" :
                                   "border-blue-100 bg-blue-50 hover:border-blue-200"
            )}>
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
