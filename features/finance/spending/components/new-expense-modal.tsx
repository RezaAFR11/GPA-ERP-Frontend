"use client";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Paperclip, Camera, ClipboardPaste, Loader2, X, FileImage, Receipt } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { projectsApi, costCodesApi, costCentresApi, expensesApi } from "@/lib/api";
import { toastSuccess, toastError } from "@/lib/hooks/use-toast";
import { getErrorMessage, formatCurrency, getCurrencySymbol } from "@/lib/utils";
import { useRole } from "@/lib/auth-context";
import type { CostCode } from "@/lib/types";

/* ─── Schemas ─────────────────────────────────────────────────────────────── */

const baseSchema = z.object({
  expense_type:  z.enum(["regular", "reimbursement"]),
  project_id:    z.coerce.number().optional(),
  cost_code_id:  z.coerce.number().optional(),
  cost_centre_id: z.coerce.number().optional(),
  amount:        z.coerce.number().min(0.01, "Amount must be > 0"),
  description:   z.string().min(3, "At least 3 characters"),
  vendor_name:   z.string().max(255).optional().or(z.literal("")),
  reference_no:  z.string().max(100).optional().or(z.literal("")),
  receipt_url:   z.string().optional().or(z.literal("")),
}).superRefine((val, ctx) => {
  if (val.expense_type === "regular" && !val.project_id) {
    ctx.addIssue({ code: "custom", path: ["project_id"], message: "Select a project" });
  }
  if (val.expense_type === "regular" && (!val.cost_code_id || val.cost_code_id < 1)) {
    ctx.addIssue({ code: "custom", path: ["cost_code_id"], message: "Select a cost code" });
  }
  if (val.expense_type === "reimbursement" && !val.receipt_url) {
    ctx.addIssue({ code: "custom", path: ["receipt_url"], message: "Receipt is required for reimbursements" });
  }
});

type FormData = z.infer<typeof baseSchema>;

interface Props { open: boolean; onClose: () => void; }

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function NewExpenseModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const { isSelfService } = useRole();      // STAFF or WORKER
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [amountDisplay, setAmountDisplay] = useState("");
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => expensesApi.uploadReceipt(file),
    onSuccess: (res) => {
      setValue("receipt_url", res.data.url, { shouldValidate: true });
      setUploadedFilename(res.data.filename || res.data.url.split("/").pop() || "file");
      toastSuccess("Receipt uploaded", res.data.filename ?? "");
    },
    onError: (err) => toastError("Upload failed", getErrorMessage(err)),
  });

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  }

  const { register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      expense_type: isSelfService ? "reimbursement" : "regular",
    },
  });

  const expenseType = watch("expense_type");
  const projectId   = watch("project_id");
  const isReimbursement = expenseType === "reimbursement";

  // Load data
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", "active-for-expense"],
    queryFn: () => projectsApi.list({ status: "active", archived: false, limit: 500 }).then((r) => r.data.items),
    enabled: open && !isReimbursement,
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ["cost-codes"],
    queryFn: () => costCodesApi.list().then((r) => r.data),
    enabled: open && !isSelfService,
  });

  const { data: costCentres = [] } = useQuery({
    queryKey: ["cost-centres"],
    queryFn: () => costCentresApi.list().then((r) => r.data),
    enabled: open && !isSelfService,
  });

  // Group cost codes
  const categories    = Array.from(new Set(costCodes.map((c) => c.category)));
  const filteredCodes = selectedCategory
    ? costCodes.filter((c) => c.category === selectedCategory && c.parent_id !== null)
    : costCodes.filter((c) => c.parent_id !== null);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Step 1: create draft
      const res = await expensesApi.create({
        expense_type:   data.expense_type,
        project_id:     isReimbursement ? null : (data.project_id ?? undefined),
        // self-service reimbursements: omit cost_code_id — backend auto-assigns 99.10
        cost_code_id:   (isSelfService && isReimbursement) ? (0 as number) : (data.cost_code_id && data.cost_code_id > 0 ? data.cost_code_id : 0),
        cost_centre_id: data.cost_centre_id && data.cost_centre_id > 0 ? data.cost_centre_id : undefined,
        amount:         data.amount,
        description:    data.description,
        vendor_name:    data.vendor_name || undefined,
        reference_no:   data.reference_no || undefined,
        receipt_url:    data.receipt_url || undefined,
      });
      // Step 2: for self-service reimbursements, auto-submit immediately (no manual 2nd step)
      if (isSelfService && isReimbursement) {
        await expensesApi.submit(res.data.id);
      }
      return res;
    },
    onSuccess: (res) => {
      toastSuccess(
        isSelfService && isReimbursement ? "Reimbursement diajukan" : "Expense created",
        isSelfService && isReimbursement
          ? `#${res.data.id} · ${formatCurrency(res.data.amount)} — menunggu verifikasi GA`
          : `Draft #${res.data.id} - ${formatCurrency(res.data.amount)}`
      );
      qc.invalidateQueries({ queryKey: ["expenses"] });
      handleClose();
    },
    onError: (err) => toastError("Failed to submit reimbursement", getErrorMessage(err)),
  });

  function handleClose() {
    reset({ expense_type: isSelfService ? "reimbursement" : "regular" });
    setAmountDisplay(""); setSelectedCategory(null); setUploadedFilename(null);
    onClose();
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw   = e.target.value.replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    const int   = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    setAmountDisplay(parts.length > 1 ? `${int}.${parts[1].slice(0, 2)}` : int);
    setValue("amount", parseFloat(raw) || 0, { shouldValidate: true });
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const num  = parseFloat(text.replace(/[^0-9.]/g, ""));
      if (!isNaN(num)) {
        setValue("amount", num, { shouldValidate: true });
        setAmountDisplay(num.toLocaleString("en", { maximumFractionDigits: 2 }));
      }
    } catch {}
  }

  const selectedProject = projects.find((p) => p.id === Number(projectId));

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isReimbursement ? "Reimbursement Request" : "New Expense"}
      subtitle={
        isReimbursement
          ? "Submit your personal expense for reimbursement — receipt required"
          : "Create a draft expense — submit it when ready for approval"
      }
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={isSubmitting || createMutation.isPending}
            onClick={handleSubmit((d) => createMutation.mutate(d))}
          >
            {isReimbursement ? "Submit Reimbursement" : "Create Draft"}
          </Button>
        </>
      }
    >
      <form className="space-y-4 text-sm" onSubmit={(e) => e.preventDefault()}>

        {/* Expense type toggle — hidden for STAFF/WORKER (always reimbursement) */}
        {!isSelfService && (
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {(["regular", "reimbursement"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setValue("expense_type", t)}
                className={[
                  "flex-1 py-2.5 text-xs font-semibold transition-all",
                  expenseType === t
                    ? t === "reimbursement"
                      ? "bg-amber-500 text-white"
                      : "bg-gray-900 text-white"
                    : "bg-white text-gray-500 hover:text-gray-700",
                ].join(" ")}
              >
                {t === "regular" ? "Regular Expense" : "Reimbursement"}
              </button>
            ))}
          </div>
        )}

        {/* Reimbursement info banner */}
        {isReimbursement && (
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3">
            <Receipt size={15} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <p className="font-semibold mb-0.5">Alur persetujuan reimbursement</p>
              <p className="text-amber-700">
                Kamu submit → GA verifikasi bukti → Cost Control → Finance setujui &amp; bayar
              </p>
            </div>
          </div>
        )}

        {/* Project (regular only) */}
        {!isReimbursement && (
          <>
            <Select
              label="Project"
              placeholder="Select project…"
              error={errors.project_id?.message}
              {...register("project_id")}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} · {p.name}</option>
              ))}
            </Select>

            {selectedProject && (
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs">
                <span className="text-gray-500">Available budget</span>
                <span className={`num font-semibold ${selectedProject.budget < 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(selectedProject.budget)}
                </span>
              </div>
            )}
          </>
        )}

        {/* Category + Cost Code — hidden for self-service (backend auto-assigns 99.10) */}
        {!isSelfService && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Category</label>
              <select
                value={selectedCategory ?? ""}
                onChange={(e) => { setSelectedCategory(e.target.value || null); setValue("cost_code_id", 0); }}
                className="w-full min-w-0 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 cursor-pointer"
              >
                <option value="">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <Select
              label="Cost Code"
              placeholder="Select code…"
              error={errors.cost_code_id?.message}
              className="text-xs"
              {...register("cost_code_id")}
            >
              {filteredCodes.map((c) => (
                <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
              ))}
            </Select>
          </div>
        )}

        {!isReimbursement && (
          <Select label="Cost Centre" placeholder="Source of money..." className="text-xs" {...register("cost_centre_id")}>
            {costCentres.map((centre) => (
              <option key={centre.id} value={centre.id}>{centre.code} · {centre.name}</option>
            ))}
          </Select>
        )}

        {/* Amount */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Amount</label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
                {getCurrencySymbol()}
              </span>
              <input
                type="text" inputMode="decimal"
                value={amountDisplay} onChange={handleAmountChange}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 text-xs border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
              />
            </div>
            <button type="button" onClick={pasteFromClipboard} title="Paste from clipboard"
              className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
              <ClipboardPaste size={15} />
            </button>
          </div>
          {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
        </div>

        {/* Description */}
        <Textarea
          label="Description"
          placeholder={isReimbursement ? "e.g. Makan siang klien, transport ke site…" : "Brief description of the expense…"}
          error={errors.description?.message}
          {...register("description")}
        />

        {/* Vendor + Reference — vendor hidden for self-service */}
        {isSelfService ? (
          <Input
            label="Reference No."
            placeholder="e.g. No. nota / kwitansi"
            className="text-xs"
            {...register("reference_no")}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Vendor / Supplier"
              placeholder="e.g. Warung Padang Sederhana"
              className="text-xs"
              {...register("vendor_name")}
            />
            <Input
              label="Reference No."
              placeholder="e.g. INV-2026-001"
              className="text-xs"
              {...register("reference_no")}
            />
          </div>
        )}

        {/* Receipt */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Receipt {isReimbursement && <span className="text-red-500 ml-0.5">*</span>}
          </label>

          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

          <div className="flex gap-2 items-start">
            <Input
              placeholder="https://drive.google.com/… or paste link"
              error={errors.receipt_url?.message}
              className="flex-1 min-w-0 text-xs"
              {...register("receipt_url")}
            />
            <button type="button" title="Take photo" disabled={uploadMutation.isPending}
              onClick={() => cameraInputRef.current?.click()}
              className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
              {uploadMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
            </button>
            <button type="button" title="Attach file (JPG, PNG, PDF — max 10 MB)" disabled={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
              className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
              <Paperclip size={15} />
            </button>
          </div>

          {uploadedFilename && (
            <div className="flex items-center gap-1.5 mt-1 px-2 py-1 bg-green-50 border border-green-200 rounded-lg w-fit max-w-full">
              <FileImage size={12} className="text-green-600 shrink-0" />
              <span className="text-[11px] text-green-700 truncate max-w-[200px]">{uploadedFilename}</span>
              <button type="button" onClick={() => { setValue("receipt_url", ""); setUploadedFilename(null); }} className="text-green-500 hover:text-green-700 shrink-0">
                <X size={11} />
              </button>
            </div>
          )}

          <p className="text-[10px] text-gray-400">
            {isReimbursement
              ? "Foto struk atau nota wajib dilampirkan untuk reimbursement"
              : "Upload langsung (JPG, PNG, PDF, maks 10 MB) atau tempel link Google Drive / SharePoint"
            }
          </p>
        </div>
      </form>
    </Modal>
  );
}
