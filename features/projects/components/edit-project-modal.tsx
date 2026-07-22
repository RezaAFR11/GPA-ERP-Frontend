"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { projectsApi } from "@/lib/api";
import type { Project, ProjectStatus } from "@/lib/types";
import { CURRENCIES, cn, getErrorMessage, type CurrencyCode } from "@/lib/utils";

const STATUS_OPTS: ProjectStatus[] = ["active", "on_hold", "completed", "cancelled"];
const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Active", on_hold: "On Hold", completed: "Completed", cancelled: "Cancelled",
};
type ProjectExpenseSortKey = "description" | "cost_code" | "amount" | "status" | "date";
type ProjectRevenueSortKey = "description" | "amount" | "status" | "date";

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in",
      ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
    )}>
      {ok ? <Check size={15} /> : <X size={15} />}
      {msg}
    </div>
  );
}

export function EditModal({
  project, onClose,
}: { project: Project; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name:           project.name,
    contract_value: String(project.contract_value),
    currency:       project.currency ?? "IDR",
    status:         project.status as ProjectStatus,
    start_date:     project.start_date?.slice(0, 10) ?? "",
    end_date:       project.end_date?.slice(0, 10) ?? "",
  });
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const save = useMutation({
    mutationFn: () => projectsApi.update(project.id, {
      name:           form.name,
      contract_value: parseFloat(form.contract_value),
      currency:       form.currency,
      status:         form.status,
      start_date:     form.start_date || null,
      end_date:       form.end_date   || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", project.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      onClose();
    },
    onError: (e) => {
      setToast({ msg: getErrorMessage(e), ok: false });
      setTimeout(() => setToast(null), 3500);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      {toast && <Toast {...toast} />}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Edit Project</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
            <X size={15} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Project Code
            </label>
            <input
              value={project.code}
              disabled
              className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Project Name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Currency
            </label>
            <select
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Contract Value
            </label>
            <input
              type="number"
              value={form.contract_value}
              onChange={(e) => setForm((f) => ({ ...f, contract_value: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProjectStatus }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {STATUS_OPTS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary" size="sm"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
