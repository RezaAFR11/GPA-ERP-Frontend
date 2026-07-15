"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, MapPin, Camera } from "lucide-react";
import { hrisMeApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ClockInModal from "@/app/(app)/hris/attendance/components/clock-in-modal";
import { SelfieModal } from "@/components/hris/SelfieModal";
import { AuthenticatedImage } from "@/components/ui/authenticated-image";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { cn, toLocalDateInputValue } from "@/lib/utils";
import type { MyAttendanceRecord } from "@/lib/types";

const MONTH_NAMES = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];
const DAY_SHORT = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

function formatTime(iso: string | null | undefined) {
  if (!iso) return "–";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function totalHours(r: { hours_regular: number; hours_overtime_weekday: number; hours_overtime_weekend: number; hours_overtime_holiday: number }) {
  return +(r.hours_regular + r.hours_overtime_weekday + r.hours_overtime_weekend + r.hours_overtime_holiday).toFixed(1);
}

export default function MyAttendancePage() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [showModal, setShowModal] = useState(false);
  const todayString = toLocalDateInputValue(today);

  const { data, error, isError, isLoading, refetch } = useQuery({
    queryKey: ["hris-me-attendance", year, month],
    queryFn: () => hrisMeApi.getAttendance(year, month).then((r) => r.data),
  });

  const clockState  = data?.clock_state ?? "not_clocked_in";
  const todayRecord = data?.today;
  const [selfieRec, setSelfieRec] = useState<MyAttendanceRecord | null>(null);


  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const daysInMonth  = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const recordMap = Object.fromEntries((data?.records ?? []).map((r) => [r.date, r]));

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <h1 className="text-lg font-bold text-gray-900">Absensi Saya</h1>
        <Card className="border p-4 text-sm text-gray-400">Memuat data absensi...</Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <h1 className="text-lg font-bold text-gray-900">Absensi Saya</h1>
        <QueryErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Absensi Saya</h1>
        <div className="flex items-center gap-2">
          {clockState !== "clocked_out" && (
            <Button
              size="sm"
              onClick={() => setShowModal(true)}
              className={cn(
                "text-xs font-semibold text-white",
                clockState === "clocked_in"
                  ? "bg-gray-600 hover:bg-gray-700 border-gray-600"
                  : "bg-teal-600 hover:bg-teal-700 border-teal-600",
              )}
            >
              {clockState === "clocked_in" ? "Absen Keluar" : "Absen Masuk"}
            </Button>
          )}
        </div>
      </div>

      {/* Today Card */}
      <Card className={cn(
        "border-2",
        clockState === "clocked_in"     && "border-teal-400 bg-teal-50",
        clockState === "clocked_out"    && "border-gray-200 bg-gray-50",
        clockState === "not_clocked_in" && "border-amber-300 bg-amber-50",
      )}>
        <div className="p-4">
          <p className="text-xs text-gray-400 mb-2">
            {todayRecord?.date && todayRecord.date !== todayString
              ? `Shift aktif sejak ${new Date(`${todayRecord.date}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}`
              : `Hari ini · ${today.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}`}
          </p>
          <div className="flex gap-6">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Masuk</p>
              <p className="text-base font-bold text-gray-900">{formatTime(todayRecord?.clock_in)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Keluar</p>
              <p className="text-base font-bold text-gray-900">{formatTime(todayRecord?.clock_out)}</p>
            </div>
            {todayRecord && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total</p>
                <p className="text-base font-bold text-gray-900">{totalHours(todayRecord)} jam</p>
              </div>
            )}
          </div>
          {/* Selfie thumbnail */}
          {todayRecord?.selfie_url && (
            <div className="mt-2 flex items-center gap-2">
              <button onClick={() => setSelfieRec(todayRecord)} className="group">
                <AuthenticatedImage
                  src={todayRecord.selfie_url}
                  alt="selfie"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-teal-300 shadow group-hover:ring-teal-500 transition-all"
                />
              </button>
              {todayRecord.face_verified && (
                <span className="text-[10px] text-teal-700 flex items-center gap-1">
                  <Camera size={10} /> Wajah terdeteksi
                  {todayRecord.face_confidence != null && ` (${(todayRecord.face_confidence * 100).toFixed(0)}%)`}
                </span>
              )}
            </div>
          )}
          {/* Location label */}
          {todayRecord?.matched_location_name ? (
            <div className="flex items-center gap-1 mt-1.5">
              <MapPin size={10} className="text-teal-500" />
              <span className={cn(
                "text-[10px] font-medium",
                todayRecord.matched_location_type === "home_office" ? "text-teal-700" : "text-blue-700"
              )}>
                {todayRecord.matched_location_type === "home_office" ? "🏢" : "⛏"} Di {todayRecord.matched_location_name}
              </span>
            </div>
          ) : todayRecord?.latitude != null ? (
            <div className="flex items-center gap-1 text-[10px] text-amber-600 mt-1">
              <MapPin size={10} />
              Di luar radius · {Number(todayRecord.latitude).toFixed(5)}, {Number(todayRecord.longitude).toFixed(5)}
            </div>
          ) : null}
        </div>
      </Card>

      {/* Month Navigator */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-800">{MONTH_NAMES[month - 1]} {year}</p>
          {data && (
            <p className="text-xs text-gray-400">
              {data.summary.attendance_days} hari hadir · {data.summary.total_hours.toFixed(1)} jam
            </p>
          )}
        </div>
        <button
          onClick={nextMonth}
          disabled={year === today.getFullYear() && month === today.getMonth() + 1}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white border rounded-xl p-3">
        <div className="grid grid-cols-7 mb-1">
          {DAY_SHORT.map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`blank-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const rec = recordMap[dateStr];
            const cellDate  = new Date(year, month - 1, day);
            const isToday   = dateStr === todayString;
            const isFuture  = dateStr > todayString;
            const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
            return (
              <div
                key={day}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors",
                  isToday && "ring-2 ring-teal-400",
                  rec && !isFuture && "bg-teal-50",
                  isWeekend && !rec && "text-gray-400",
                  !rec && !isFuture && !isWeekend && "text-gray-500",
                  isFuture && "text-gray-300",
                )}
              >
                <span className={cn("text-[11px] font-medium", isToday && "text-teal-700 font-bold")}>
                  {day}
                </span>
                {rec && <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-0.5" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Record List */}
      <div className="space-y-2">
        {(data?.records ?? []).map((rec) => (
          <Card key={rec.id} className="border">
            <div className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {new Date(`${rec.date}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                  <div className="flex gap-4 mt-1">
                    <div>
                      <p className="text-[10px] text-gray-400">Masuk</p>
                      <p className="text-xs font-medium">{formatTime(rec.clock_in)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Keluar</p>
                      <p className="text-xs font-medium">{formatTime(rec.clock_out)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Jam Kerja</p>
                      <p className="text-xs font-medium">{totalHours(rec)} jam</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {rec.selfie_url ? (
                    <button onClick={() => setSelfieRec(rec)} className="group">
                      <AuthenticatedImage
                        src={rec.selfie_url}
                        alt="selfie"
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow group-hover:ring-teal-400 transition-all"
                      />
                    </button>
                  ) : rec.face_verified ? (
                    <Badge className="text-[9px] px-1.5 py-0 bg-teal-50 text-teal-700 border-teal-200">
                      <Camera size={8} className="mr-0.5" /> Terdeteksi
                    </Badge>
                  ) : (
                    <Badge className="text-[9px] px-1.5 py-0 bg-gray-50 text-gray-500 border-gray-200">
                      Manual
                    </Badge>
                  )}
                  {rec.matched_location_name ? (
                    <span className="text-[9px] text-teal-600 font-medium">
                      {rec.matched_location_type === "home_office" ? "🏢" : "⛏"} {rec.matched_location_name}
                    </span>
                  ) : rec.source ? (
                    <span className="text-[9px] text-gray-400 capitalize">{rec.source}</span>
                  ) : null}
                </div>
              </div>
              {(rec.hours_overtime_weekday > 0 || rec.hours_overtime_weekend > 0) && (
                <p className="text-[10px] text-amber-600 mt-1.5">
                  OT: {(rec.hours_overtime_weekday + rec.hours_overtime_weekend + rec.hours_overtime_holiday).toFixed(1)} jam
                </p>
              )}
            </div>
          </Card>
        ))}
        {data?.records.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Belum ada catatan absensi bulan ini
          </div>
        )}
      </div>

      {showModal && (
        <ClockInModal
          mode={clockState === "clocked_in" ? "clock-out" : "clock-in"}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); refetch(); }}
        />
      )}

      {selfieRec?.selfie_url && (
        <SelfieModal
          open={!!selfieRec}
          onClose={() => setSelfieRec(null)}
          selfie_url={selfieRec.selfie_url!}
          face_verified={selfieRec.face_verified}
          face_confidence={selfieRec.face_confidence}
          employee_name="Saya"
          date={selfieRec.date}
        />
      )}
    </div>
  );
}
