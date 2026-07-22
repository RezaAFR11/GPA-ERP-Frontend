"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { hrisRecruitmentApi } from "@/lib/api";
import type { Applicant } from "@/lib/types";
import { cn } from "@/lib/utils";

export function OnboardingPanel({ applicant, onClose }: { applicant: Applicant; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["hris", "onboarding", applicant.id],
    queryFn:  () => hrisRecruitmentApi.getOnboarding(applicant.id).then(r => r.data),
  });

  const completeMut = useMutation({
    mutationFn: ({ id, val }: { id: number; val: boolean }) =>
      hrisRecruitmentApi.completeTask(id, val),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hris", "onboarding", applicant.id] }),
  });

  const done  = tasks.filter(t => t.is_completed).length;
  const total = tasks.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <p className="font-semibold text-gray-900 text-sm">Onboarding</p>
          <p className="text-xs text-gray-400">{applicant.full_name}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>

      {/* Progress */}
      <div className="px-5 py-3 border-b border-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span>{done}/{total} selesai</span>
          <span className="font-semibold text-teal-700">{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
          : tasks.map(t => (
              <button key={t.id}
                onClick={() => completeMut.mutate({ id: t.id, val: !t.is_completed })}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors",
                  t.is_completed
                    ? "bg-teal-50 border-teal-100 text-teal-800"
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                )}>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                  t.is_completed ? "bg-teal-500 border-teal-500" : "border-gray-300"
                )}>
                  {t.is_completed && <Check size={11} className="text-white" />}
                </div>
                <p className={cn("text-xs font-medium", t.is_completed && "line-through opacity-70")}>{t.task}</p>
              </button>
            ))
        }
      </div>
    </div>
  );
}
