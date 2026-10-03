"use client";

import { ArrowRight, AlertTriangle, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import type { OperationalAssignee, OperationalRecord } from "@/lib/types";
import { ACTION_META } from "./operational-workspace-config";

export function nextProcessor(record: OperationalRecord) {
  const workflow = record.workflow;
  if (!workflow) return "Buka detail untuk melihat langkah berikutnya";
  if (!workflow.next_action) return "Tidak ada tindakan berikutnya";
  if (workflow.next_user_name) return `${workflow.next_user_name} · ${workflow.next_user_role?.replaceAll("_", " ")}`;
  if (workflow.assignment_missing) return "Penanggung jawab perlu ditetapkan ulang";
  return workflow.candidates.map(user => user.name).join(", ") || "Pilih penanggung jawab";
}

export function WorkflowGuide({ record, onAction, onEdit }: {
  record: OperationalRecord;
  onAction: (action: string) => void;
  onEdit?: () => void;
}) {
  const workflow = record.workflow;
  if (!workflow) return null;
  const position: Record<string, number> = { draft: 0, rejected: 0, submitted: 1, in_review: 2, approved: 3, active: 3, completed: 4, closed: 5 };
  const current = position[record.status] ?? 0;
  return (
    <section className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <UserRound className="text-teal-700 shrink-0 mt-1" size={20} />
        <div className="min-w-0">
          <p className="text-xs text-teal-800 font-semibold">Langkah berikutnya · {nextProcessor(record)}</p>
          <p className="text-sm text-slate-800 mt-1">{workflow.instruction}</p>
          {workflow.assignment_missing && <p className="text-xs text-amber-800 mt-2 flex gap-1"><AlertTriangle size={14} /> Hubungi administrator untuk memperbarui penanggung jawab.</p>}
        </div>
      </div>
      <ol className="flex flex-wrap gap-2" aria-label="Tahapan proses">
        {workflow.steps.map((step, index) => (
          <li key={step.label} className="flex items-center gap-2">
            <div aria-current={current === index ? "step" : undefined} className={`rounded-lg border px-3 py-2 text-xs ${index === current ? "bg-teal-700 border-teal-700 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
              <p className="font-semibold">{index + 1}. {step.label}</p>
              <p className="mt-1 max-w-44 break-words">{step.user_name ?? (step.user_id ? "Pengguna tidak tersedia" : "Tim approver modul")}</p>
            </div>
            {index < workflow.steps.length - 1 && <ArrowRight size={14} className="text-teal-700" />}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {onEdit && record.status !== "closed" && !record.details.superseded_by_id && <Button size="sm" variant="secondary" onClick={onEdit}>{["draft", "rejected"].includes(record.status) ? "Lengkapi draf" : "Perbarui progres"}</Button>}
        {workflow.available_actions.filter(action => !["cancel", "reject"].includes(action)).map(action => (
          <Button size="sm" key={action} onClick={() => onAction(action)}>{ACTION_META[action]?.label ?? action}</Button>
        ))}
        {workflow.available_actions.includes("reject") && <Button size="sm" variant="danger" onClick={() => onAction("reject")}>Kembalikan untuk perbaikan</Button>}
      </div>
    </section>
  );
}

export function WorkflowRouting({ users, details, ownerId, onOwnerChange, onChange, disabled }: {
  users: OperationalAssignee[]; details: Record<string, string>; ownerId: string;
  onOwnerChange: (id: string) => void; onChange: (details: Record<string, string>) => void; disabled?: boolean;
}) {
  const approvers = users.filter(user => user.can_approve);
  return (
    <div className="sm:col-span-2 rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-3">
      <p className="text-sm font-semibold text-teal-900">Siapa yang mengerjakan selanjutnya?</p>
      <p className="text-xs text-slate-600">Penanggung jawab menerima notifikasi saat gilirannya tiba. Pilihan mengikuti hak akses modul yang sudah diberikan.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Select label="Pembuat / pemilik draf" value={ownerId} disabled={disabled} onChange={e => onOwnerChange(e.target.value)}>
          <option value="">Saya sendiri</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name} · {u.role.replaceAll("_", " ")}</option>)}
        </Select>
        {[["workflow_reviewer_id", "Pemeriksa & pemberi persetujuan"], ["workflow_executor_id", "PIC pelaksanaan & progres"], ["workflow_closer_id", "Pemeriksa penyelesaian / penutupan"]].map(([key, label]) => (
          <Select key={key} label={label} value={details[key] ?? ""} disabled={disabled} onChange={e => onChange({ ...details, [key]: e.target.value })}>
            <option value="">Pilih pengguna</option>
            {approvers.map(u => <option key={u.id} value={u.id}>{u.name} · {u.role.replaceAll("_", " ")}</option>)}
          </Select>
        ))}
      </div>
      {!approvers.length && <p className="text-xs text-amber-800">Belum ada approver yang dapat dipilih. Minta administrator memeriksa akun dan akses modul.</p>}
    </div>
  );
}
