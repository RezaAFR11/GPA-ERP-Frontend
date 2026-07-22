"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Briefcase,
  CalendarClock,
  Check,
  CheckCircle2,
  PlusCircle,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/lib/auth-context";
import { hrisRecruitmentApi } from "@/lib/api";
import type { Applicant, ApplicantStage } from "@/lib/types";
import { cn, fmtDate } from "@/lib/utils";
import { AddApplicantModal } from "./components/add-applicant-modal";
import { HireModal } from "./components/hire-modal";
import { InterviewModal } from "./components/interview-modal";
import { NewPostingModal } from "./components/new-posting-modal";
import { OnboardingPanel } from "./components/onboarding-panel";

const STAGES: { key: ApplicantStage; label: string; color: string; bg: string }[] = [
  { key: "RECEIVED",  label: "Masuk",      color: "text-gray-600",   bg: "bg-gray-50"    },
  { key: "SCREENING", label: "Screening",  color: "text-blue-700",   bg: "bg-blue-50"    },
  { key: "INTERVIEW", label: "Interview",  color: "text-purple-700", bg: "bg-purple-50"  },
  { key: "OFFER",     label: "Penawaran",  color: "text-amber-700",  bg: "bg-amber-50"   },
  { key: "HIRED",     label: "Diterima",   color: "text-teal-700",   bg: "bg-teal-50"    },
  { key: "REJECTED",  label: "Ditolak",    color: "text-red-600",    bg: "bg-red-50"     },
];

const NEXT_STAGE: Partial<Record<ApplicantStage, ApplicantStage>> = {
  RECEIVED:  "SCREENING",
  SCREENING: "INTERVIEW",
  INTERVIEW: "OFFER",
  OFFER:     "HIRED",
};

export default function RecruitmentPage() {
  const qc = useQueryClient();
  const { hasRole } = useRole();
  const canManagePipeline = hasRole("SUPER_ADMIN", "MD", "PM", "PROJECT_CONTROL", "GA", "HR");
  const canHire = hasRole("SUPER_ADMIN", "MD", "GA", "HR");
  const [search, setSearch]         = useState("");
  const [selectedPosting, setSelectedPosting] = useState<number | "all">("all");
  const [showNewPosting,  setShowNewPosting]  = useState(false);
  const [showAddApplicant, setShowAddApplicant] = useState(false);
  const [onboardingApp, setOnboardingApp]     = useState<Applicant | null>(null);
  const [hireApp,        setHireApp]          = useState<Applicant | null>(null);
  const [interviewApp,   setInterviewApp]     = useState<Applicant | null>(null);

  /* Postings */
  const { data: postings = [] } = useQuery({
    queryKey: ["hris", "job-postings"],
    queryFn:  () => hrisRecruitmentApi.listPostings().then(r => r.data),
  });

  /* Applicants */
  const { data: applicants = [], isLoading } = useQuery({
    queryKey: ["hris", "applicants", { posting: selectedPosting, search }],
    queryFn:  () => hrisRecruitmentApi.listApplicants({
      posting_id: selectedPosting !== "all" ? selectedPosting : undefined,
      search:     search || undefined,
    }).then(r => r.data),
  });

  const moveMut = useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: string }) =>
      hrisRecruitmentApi.moveStage(id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hris", "applicants"] }),
  });

  /* Group by stage */
  const byStage = STAGES.reduce<Record<string, Applicant[]>>((acc, s) => {
    acc[s.key] = applicants.filter(a => a.stage === s.key);
    return acc;
  }, {} as Record<string, Applicant[]>);

  const openPostings = postings.filter(p => p.status === "OPEN");

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus size={20} className="text-green-700" /> Rekrutmen
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Pipeline pelamar & onboarding</p>
        </div>
        {canManagePipeline && <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowNewPosting(true)}
            className="border border-gray-200 text-gray-700">
            <Briefcase size={14} className="mr-1.5" /> Buka Lowongan
          </Button>
          <Button size="sm" onClick={() => setShowAddApplicant(true)}
            className="bg-green-700 hover:bg-green-800 text-white">
            <PlusCircle size={14} className="mr-1.5" /> Tambah Pelamar
          </Button>
        </div>}
      </div>

      {/* Filter bar */}
      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          {/* Posting filter */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedPosting("all")}
              className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors",
                selectedPosting === "all"
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}>
              Semua ({applicants.length})
            </button>
            {openPostings.map(p => (
              <button key={p.id}
                onClick={() => setSelectedPosting(p.id)}
                className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  selectedPosting === p.id
                    ? "bg-green-700 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}>
                {p.title} ({applicants.filter(a => a.posting_id === p.id).length})
              </button>
            ))}
          </div>

          <div className="relative ml-auto">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari pelamar…"
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-green-500 w-44" />
          </div>
        </div>
      </Card>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map(stage => {
          const cards = byStage[stage.key] ?? [];
          return (
            <div key={stage.key} className="shrink-0 w-52">
              {/* Column header */}
              <div className={cn("flex items-center justify-between px-3 py-2 rounded-t-xl mb-0", stage.bg)}>
                <p className={cn("text-xs font-semibold", stage.color)}>{stage.label}</p>
                <Badge className={cn("border-0 text-[10px]", stage.bg, stage.color)}>{cards.length}</Badge>
              </div>

              {/* Cards */}
              <div className="space-y-2 bg-gray-50 rounded-b-xl p-2 min-h-[200px]">
                {isLoading
                  ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
                  : cards.map(app => {
                      const nextStage = NEXT_STAGE[app.stage];
                      return (
                        <div key={app.id}
                          className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow">
                          <p className="text-xs font-semibold text-gray-900 leading-tight">{app.full_name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{app.source.replace("_"," ")}</p>
                          <p className="text-[11px] text-gray-400">{fmtDate(app.created_at)}</p>

                          <div className="flex gap-1 mt-2">
                            {canManagePipeline && app.stage === "RECEIVED" && nextStage && (
                              <button
                                onClick={() => moveMut.mutate({ id: app.id, stage: nextStage })}
                                disabled={moveMut.isPending}
                                className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg py-1 transition-colors">
                                <ArrowRight size={10} /> Maju
                              </button>
                            )}
                            {canManagePipeline && ["SCREENING", "INTERVIEW"].includes(app.stage) && (
                              <button
                                onClick={() => setInterviewApp(app)}
                                className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg py-1 transition-colors">
                                <CalendarClock size={10} />
                                {app.stage === "SCREENING" ? "Jadwal" : "Hasil"}
                              </button>
                            )}
                            {canHire && app.stage === "OFFER" && (
                              <button
                                onClick={() => setHireApp(app)}
                                className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg py-1 transition-colors">
                                <Check size={10} /> Hire
                              </button>
                            )}
                            {canManagePipeline && app.stage === "HIRED" && (
                              <button
                                onClick={() => setOnboardingApp(app)}
                                className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg py-1 transition-colors">
                                <CheckCircle2 size={10} /> Onboarding
                              </button>
                            )}
                            {canManagePipeline && !["HIRED", "REJECTED"].includes(app.stage) && (
                              <button
                                onClick={() => moveMut.mutate({ id: app.id, stage: "REJECTED" })}
                                disabled={moveMut.isPending}
                                className="text-[11px] font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg px-1.5 py-1 transition-colors">
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* Posting list */}
      <Card padding={false}>
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Daftar Lowongan</p>
        </div>
        <div className="divide-y divide-gray-50">
          {postings.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">Belum ada lowongan</p>
            : postings.map(p => {
                const count = applicants.filter(a => a.posting_id === p.id).length;
                const statusCls: Record<string, string> = {
                  OPEN:    "bg-teal-50 text-teal-700 border-teal-200",
                  CLOSED:  "bg-gray-100 text-gray-500 border-gray-200",
                  ON_HOLD: "bg-amber-50 text-amber-700 border-amber-200",
                };
                return (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.title}</p>
                      <p className="text-xs text-gray-400">{count} pelamar · dibuka {fmtDate(p.opened_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={statusCls[p.status] ?? ""}>{p.status}</Badge>
                      {canManagePipeline && p.status === "OPEN" && (
                        <button
                          onClick={() => hrisRecruitmentApi.updatePosting(p.id, { status: "CLOSED" })
                            .then(() => qc.invalidateQueries({ queryKey: ["hris", "job-postings"] }))}
                          className="text-xs text-gray-400 hover:text-red-500"
                        >Tutup</button>
                      )}
                    </div>
                  </div>
                );
              })
          }
        </div>
      </Card>

      {/* ── Modals & panels ───────────────────────────────────────────── */}
      {canManagePipeline && (
        <>
          <NewPostingModal open={showNewPosting} onClose={() => setShowNewPosting(false)}
            onCreated={() => qc.invalidateQueries({ queryKey: ["hris", "job-postings"] })} />

          <AddApplicantModal open={showAddApplicant} onClose={() => setShowAddApplicant(false)}
            postings={postings}
            onCreated={() => qc.invalidateQueries({ queryKey: ["hris", "applicants"] })} />

          <InterviewModal key={interviewApp?.id ?? "none"} applicant={interviewApp}
            onClose={() => setInterviewApp(null)}
            onUpdated={() => {
              qc.invalidateQueries({ queryKey: ["hris", "applicants"] });
              qc.invalidateQueries({ queryKey: ["hris", "interviews"] });
            }} />
        </>
      )}

      {canHire && <HireModal applicant={hireApp} onClose={() => setHireApp(null)}
        onHired={() => qc.invalidateQueries({ queryKey: ["hris", "applicants"] })} />}

      {onboardingApp && (
        <OnboardingPanel applicant={onboardingApp} onClose={() => setOnboardingApp(null)} />
      )}
    </div>
  );
}
