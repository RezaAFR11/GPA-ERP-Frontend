"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList, CommandSeparator } from "cmdk";
import { BriefcaseBusiness, FolderOpen, Receipt, DollarSign, FileText, Package, Search, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchApi } from "@/lib/api";
import { ResultItem } from "./result-item";
import { cn, formatCurrency } from "@/lib/utils";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft:       { label: "Draft",     cls: "bg-gray-100 text-gray-600" },
  submitted:   { label: "Submitted", cls: "bg-blue-100 text-blue-700" },
  in_review:   { label: "In Review", cls: "bg-cyan-100 text-cyan-700" },
  verified:    { label: "Verified",  cls: "bg-purple-100 text-purple-700" },
  approved:    { label: "Approved",  cls: "bg-emerald-100 text-emerald-700" },
  paid:        { label: "Paid",      cls: "bg-green-100 text-green-700" },
  rejected:    { label: "Rejected",  cls: "bg-red-100 text-red-700" },
  hard_locked: { label: "Locked",    cls: "bg-gray-200 text-gray-700" },
  confirmed:   { label: "Confirmed", cls: "bg-green-100 text-green-700" },
  signed:      { label: "Signed",    cls: "bg-green-100 text-green-700" },
  active:      { label: "Active",    cls: "bg-blue-100 text-blue-700" },
  on_hold:     { label: "On Hold",   cls: "bg-amber-100 text-amber-700" },
  completed:   { label: "Done",      cls: "bg-gray-100 text-gray-600" },
  cancelled:   { label: "Cancelled", cls: "bg-red-100 text-red-600" },
  closed:      { label: "Closed", cls: "bg-slate-200 text-slate-700" },
};

interface CommandPaletteProps {
  open:    boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router  = useRouter();
  const [query, setQuery] = useState("");

  // Debounced value used for the API call
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Reset query when closed
  useEffect(() => {
    if (!open) setTimeout(() => { setQuery(""); setDebouncedQuery(""); }, 200);
  }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn:  () => searchApi.global(debouncedQuery).then((r) => r.data),
    enabled:  debouncedQuery.length >= 1,
    staleTime: 5_000,
  });

  const navigate = useCallback((path: string) => {
    router.push(path);
    onClose();
  }, [router, onClose]);

  const hasResults = data && (
    data.projects.length + data.expenses.length + data.receivables.length +
    data.legal_docs.length + data.inventory.length + data.operational_records.length
  ) > 0;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-[15%] z-50 w-full max-w-xl -translate-x-1/2 animate-fade-in">
        <Command
          shouldFilter={false}
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        >
          {/* Input row */}
          <div className="flex items-center gap-2.5 px-4 border-b border-gray-100">
            {isFetching
              ? <Loader2 size={15} className="text-gray-400 animate-spin shrink-0" />
              : <Search size={15} className="text-gray-400 shrink-0" />
            }
            <CommandInput
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search projects, expenses, invoices…"
              className="flex-1 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 bg-transparent outline-none border-none"
            />
            <kbd className="text-[10px] text-gray-400 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 font-mono shrink-0">
              Esc
            </kbd>
          </div>

          <CommandList className="max-h-[420px] overflow-y-auto p-2">
            {/* Empty state */}
            {debouncedQuery.length >= 1 && !isFetching && !hasResults && (
              <CommandEmpty className="py-10 text-center text-sm text-gray-400">
                No results for &ldquo;{debouncedQuery}&rdquo;
              </CommandEmpty>
            )}

            {/* Idle hint */}
            {debouncedQuery.length === 0 && (
              <div className="py-8 text-center text-xs text-gray-400">
                Type to search across all modules
              </div>
            )}

            {/* Projects */}
            {(data?.projects.length ?? 0) > 0 && (
              <CommandGroup heading={<GroupLabel icon={<FolderOpen size={11} />} label="Projects" />}>
                {data!.projects.map((p) => (
                  <ResultItem
                    key={p.id}
                    icon={<FolderOpen size={13} className="text-blue-600" />}
                    iconBg="bg-blue-50"
                    primary={p.name}
                    secondary={p.code}
                    badge={STATUS_BADGE[p.status]}
                    onSelect={() => navigate(`/projects/${p.id}`)}
                  />
                ))}
              </CommandGroup>
            )}

            {(data?.projects.length ?? 0) > 0 && (data?.expenses.length ?? 0) > 0 && <CommandSeparator className="my-1 border-gray-100" />}

            {/* Expenses */}
            {(data?.expenses.length ?? 0) > 0 && (
              <CommandGroup heading={<GroupLabel icon={<Receipt size={11} />} label="Expenses" />}>
                {data!.expenses.map((e) => (
                  <ResultItem
                    key={e.id}
                    icon={<Receipt size={13} className="text-orange-600" />}
                    iconBg="bg-orange-50"
                    primary={e.description}
                    secondary={formatCurrency(e.amount)}
                    badge={STATUS_BADGE[e.status]}
                    onSelect={() => navigate("/spending")}
                  />
                ))}
              </CommandGroup>
            )}

            {(data?.expenses.length ?? 0) > 0 && (data?.receivables.length ?? 0) > 0 && <CommandSeparator className="my-1 border-gray-100" />}

            {/* Receivables */}
            {(data?.receivables.length ?? 0) > 0 && (
              <CommandGroup heading={<GroupLabel icon={<DollarSign size={11} />} label="Revenue" />}>
                {data!.receivables.map((r) => (
                  <ResultItem
                    key={r.id}
                    icon={<DollarSign size={13} className="text-green-600" />}
                    iconBg="bg-green-50"
                    primary={r.invoice_no ?? r.customer_name ?? `AR-${r.id}`}
                    secondary={`${r.customer_name ?? ""}  ·  ${formatCurrency(r.amount)}`}
                    badge={STATUS_BADGE[r.status]}
                    onSelect={() => navigate("/revenue")}
                  />
                ))}
              </CommandGroup>
            )}

            {(data?.receivables.length ?? 0) > 0 && (data?.legal_docs.length ?? 0) > 0 && <CommandSeparator className="my-1 border-gray-100" />}

            {/* Legal docs */}
            {(data?.legal_docs.length ?? 0) > 0 && (
              <CommandGroup heading={<GroupLabel icon={<FileText size={11} />} label="Legal" />}>
                {data!.legal_docs.map((d) => (
                  <ResultItem
                    key={d.id}
                    icon={<FileText size={13} className="text-violet-600" />}
                    iconBg="bg-violet-50"
                    primary={d.title}
                    secondary={d.doc_number ?? d.doc_type}
                    badge={STATUS_BADGE[d.status]}
                    onSelect={() => navigate("/legal")}
                  />
                ))}
              </CommandGroup>
            )}

            {(data?.legal_docs.length ?? 0) > 0 && (data?.inventory.length ?? 0) > 0 && <CommandSeparator className="my-1 border-gray-100" />}

            {/* Inventory */}
            {(data?.inventory.length ?? 0) > 0 && (
              <CommandGroup heading={<GroupLabel icon={<Package size={11} />} label="Inventory" />}>
                {data!.inventory.map((i) => (
                  <ResultItem
                    key={i.id}
                    icon={<Package size={13} className="text-amber-600" />}
                    iconBg="bg-amber-50"
                    primary={i.name}
                    secondary={`${i.code}  ·  ${i.qty_on_hand} ${i.unit}`}
                    badge={{ label: i.category, cls: "bg-amber-100 text-amber-700" }}
                    onSelect={() => navigate("/inventory")}
                  />
                ))}
              </CommandGroup>
            )}

            {(data?.inventory.length ?? 0) > 0 && (data?.operational_records.length ?? 0) > 0 && <CommandSeparator className="my-1 border-gray-100" />}

            {/* New operational workspaces share one search result contract. */}
            {(data?.operational_records.length ?? 0) > 0 && (
              <CommandGroup heading={<GroupLabel icon={<BriefcaseBusiness size={11} />} label="Operational Records" />}>
                {data!.operational_records.map((record) => (
                  <ResultItem
                    key={`${record.module}-${record.id}`}
                    icon={<BriefcaseBusiness size={13} className="text-cyan-700" />}
                    iconBg="bg-cyan-50"
                    primary={record.title}
                    secondary={`${record.reference_no} · ${record.module.replaceAll("_", " ")}`}
                    badge={STATUS_BADGE[record.status]}
                    onSelect={() => navigate(`${record.path}?record=${record.id}`)}
                  />
                ))}
              </CommandGroup>
            )}
          </CommandList>

          {/* Footer hint */}
          <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4 text-[10px] text-gray-400">
            <span><kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1 py-0.5">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1 py-0.5">↵</kbd> open</span>
            <span><kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1 py-0.5">Esc</kbd> close</span>
          </div>
        </Command>
      </div>
    </>
  );
}

function GroupLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-1 pb-1 pt-2">
      <span className="text-gray-400">{icon}</span>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
    </div>
  );
}
