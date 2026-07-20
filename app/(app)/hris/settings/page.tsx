"use client";
import React, { useState } from "react";
import {
  MapPin, CalendarDays, DollarSign, Building2, GraduationCap,
  Users, Calendar, AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/auth-context";
import { DepartmentsTab } from "./components/departments-tab";
import { GradesTab } from "./components/grades-tab";
import { HolidayCalendarTab } from "./components/holiday-calendar-tab";
import { LeaveTypesTab } from "./components/leave-types-tab";
import { SalaryComponentsTab } from "./components/salary-components-tab";
import { WorkGroupsTab } from "./components/work-groups-tab";
import { WorkLocationsTab } from "./components/work-locations-tab";

// ── TABS ──────────────────────────────────────────────────────────────────────

type TabKey = "locations" | "leave-types" | "salary" | "departments" | "grades" | "work-groups" | "holidays";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "locations",    label: "Lokasi Kerja",     icon: MapPin         },
  { key: "leave-types",  label: "Tipe Cuti",        icon: CalendarDays   },
  { key: "salary",       label: "Komponen Gaji",    icon: DollarSign     },
  { key: "departments",  label: "Departemen",       icon: Building2      },
  { key: "grades",       label: "Jabatan",          icon: GraduationCap  },
  { key: "work-groups",  label: "Grup Kerja",       icon: Users          },
  { key: "holidays",     label: "Kalender Libur",   icon: Calendar       },
];


export default function HrisSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("locations");
  const { hasRole } = useRole();
  const canAccessSettings = hasRole("SUPER_ADMIN", "MD", "GA", "HR");
  const canManageSalary = hasRole("SUPER_ADMIN", "MD");

  if (!canAccessSettings) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <AlertTriangle size={32} className="text-amber-400" />
        <p className="text-gray-600 font-medium">Akses ditolak</p>
        <p className="text-sm text-gray-400">Halaman ini hanya untuk HR, MD, atau Super Admin</p>
      </div>
    );
  }

  const activeTabDef = TABS.find(t => t.key === activeTab)!;
  const ActiveIcon = activeTabDef.icon;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pengaturan HRIS</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Kelola konfigurasi sistem HRIS — lokasi, cuti, komponen gaji, dan kalender libur
        </p>
      </div>

      <div className="flex gap-4">
        {/* Sidebar tabs */}
        <div className="w-44 shrink-0 space-y-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                  activeTab === tab.key
                    ? "bg-teal-50 text-teal-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                )}>
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <Card className="flex-1 min-w-0">
          <div className="flex items-center gap-2 p-4 border-b border-gray-100">
            <ActiveIcon size={16} className="text-teal-600" />
            <h2 className="text-sm font-semibold text-gray-800">{activeTabDef.label}</h2>
          </div>
          <div className="p-4">
            {activeTab === "locations"   && <WorkLocationsTab />}
            {activeTab === "leave-types" && <LeaveTypesTab />}
            {activeTab === "salary"      && <SalaryComponentsTab canManage={canManageSalary} />}
            {activeTab === "departments" && <DepartmentsTab />}
            {activeTab === "grades"      && <GradesTab />}
            {activeTab === "work-groups" && <WorkGroupsTab />}
            {activeTab === "holidays"    && <HolidayCalendarTab />}
          </div>
        </Card>
      </div>
    </div>
  );
}
