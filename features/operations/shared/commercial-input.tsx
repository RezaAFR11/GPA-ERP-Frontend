"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { OperationalAttachment } from "@/lib/types";
import type { ClientPOEditorState, ClientPOLineEditor, PendingCommercialFile } from "./client-po-editor";

export const COMMERCIAL_STEPS = ["Identitas", "Lingkup & BOQ", "Nilai & termin", "Jadwal & garansi", "Dokumen", "Periksa & serahkan"];
export const DOCUMENT_KINDS: Record<string, string> = {
  client_po: "PO pelanggan", client_contract: "Perjanjian", proposal: "Proposal / quotation",
  contract_award: "Contract award", technical_scope: "Lingkup teknis", schedule: "Jadwal", supporting_document: "Pendukung",
};
const TEMPLATES: Record<string, Array<[number, string]>> = {
  goods: [[40, "PO / kontrak ditandatangani"], [30, "Pembelian dilakukan"], [30, "Material tiba di site"]],
  services: [[20, "PO ditandatangani"], [30, "Pembelian dilakukan"], [30, "Instalasi selesai"], [15, "Commissioning"], [5, "Retensi"]],
  mixed: [[25, "Down payment"], [30, "Purchase order"], [30, "FAT"], [10, "Commissioning"], [5, "Retensi"]],
};

export function commercialWarnings(details: Record<string, string>, value: ClientPOEditorState, amount: number, recordType: string) {
  const result: string[] = [];
  const needsContract = ["client_contract", "client_purchase_order"].includes(recordType);
  const sum = value.lineItems.reduce((total, item) => total + Number(item.quantity || 0) * Number(item.unit_price || 0), 0);
  const percent = value.paymentTerms.reduce((total, term) => total + Number(term.percentage || 0), 0);
  if (needsContract && !value.lineItems.length) result.push("BOQ belum diisi.");
  if (value.lineItems.length && Math.abs(sum - amount) > 1) result.push("Jumlah BOQ belum sama dengan nilai sebelum PPN.");
  if ((needsContract || value.paymentTerms.length > 0) && Math.abs(percent - 100) > 0.01) result.push(`Jumlah termin ${percent}% — perlu 100% sebelum diajukan.`);
  if (!details.workflow_reviewer_id || !details.workflow_executor_id || !details.workflow_closer_id) result.push("Pilih pemeriksa, PIC pelaksanaan, dan pemeriksa penutupan.");
  if (details.source_total) {
    const expected = amount + Number(details.tax_amount || 0) - (details.source_total_basis === "net" ? Number(details.withholding_amount || 0) : 0);
    if (Math.abs(Number(details.source_total) - expected) > 1) result.push("Total dokumen sumber berbeda dari perhitungan. Periksa PPN, PPh, dan pembulatan.");
  }
  if (needsContract && !details.po_date) result.push("Tanggal PO / kontrak belum diisi.");
  if (needsContract && (!details.delivery_term || !details.ship_to_location)) result.push("Ketentuan dan lokasi pengiriman belum lengkap.");
  if (needsContract && !details.warranty_months) result.push("Masa garansi belum diisi (gunakan 0 jika tidak ada garansi).");
  if (Number(details.withholding_amount || 0) > 0 && !details.withholding_basis?.trim()) result.push("Jelaskan dasar potongan PPh.");
  return result;
}

export function CommercialInput({ step, details, dppAmount, currency, value, onDetailsChange, onChange, onDppChange,
  pendingFiles, onPendingFilesChange, existingAttachments, onOpenAttachment, onDeleteAttachment, disabled = false }: {
  step: number; details: Record<string, string>; dppAmount: number; currency: string; value: ClientPOEditorState;
  onDetailsChange: (details: Record<string, string>) => void; onChange: (value: ClientPOEditorState) => void; onDppChange: (amount: string) => void;
  pendingFiles: PendingCommercialFile[]; onPendingFilesChange: (files: PendingCommercialFile[]) => void;
  existingAttachments: OperationalAttachment[]; onOpenAttachment: (file: OperationalAttachment) => void;
  onDeleteAttachment: (file: OperationalAttachment) => void; disabled?: boolean;
}) {
  const [documentKind, setDocumentKind] = useState("client_po");
  const set = (key: string, v: string) => onDetailsChange({ ...details, [key]: v });
  const money = (v: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency }).format(v || 0);
  const field = (key: string, label: string, type = "text") => <Input key={key} label={label} type={type} value={details[key] ?? ""} disabled={disabled && !["actual_start_date", "actual_completion_date", "warranty_start_date"].includes(key)} onChange={e => set(key, e.target.value)} />;
  const updateLine = (index: number, patch: Partial<ClientPOLineEditor>) => onChange({ ...value, lineItems: value.lineItems.map((item, i) => i === index ? { ...item, ...patch } : item) });
  const total = value.lineItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0);
  const gross = dppAmount + Number(details.tax_amount || 0);
  if (step === 1) return <>
    <p className="sm:col-span-2 text-sm text-slate-600">Masukkan hanya lingkup yang dipesan. Barang atau pekerjaan teknis yang termasuk harga dapat dicatat sebagai rincian; proposal yang belum disetujui tidak menambah nilai kontrak.</p>
    {value.lineItems.map((item, index) => <div key={index} className="sm:col-span-2 rounded-lg border p-3 grid sm:grid-cols-4 gap-3">
      <Input label="Nomor item" value={item.item_no} disabled={disabled} onChange={e => updateLine(index, { item_no: e.target.value })} />
      <Select label="Jenis" value={item.item_kind ?? "goods"} disabled={disabled} onChange={e => updateLine(index, { item_kind: e.target.value })}><option value="goods">Barang</option><option value="service">Jasa</option><option value="package">Paket / LOT</option><option value="included">Termasuk harga</option></Select>
      <Input label="Area / tag alat" value={item.area ?? ""} disabled={disabled} onChange={e => updateLine(index, { area: e.target.value })} />
      <Input label="Satuan" value={item.uom} disabled={disabled} onChange={e => updateLine(index, { uom: e.target.value })} />
      <div className="sm:col-span-4"><Textarea label="Deskripsi pekerjaan / barang" rows={2} value={item.description} disabled={disabled} onChange={e => updateLine(index, { description: e.target.value })} /></div>
      <Input label="Jumlah" type="number" min="0.0001" step="0.0001" value={item.quantity} disabled={disabled} onChange={e => updateLine(index, { quantity: e.target.value })} />
      <Input label="Harga satuan" type="number" min="0" step="0.01" value={item.unit_price} disabled={disabled} onChange={e => updateLine(index, { unit_price: e.target.value })} />
      <Input label="Manufacturer" value={item.manufacturer} disabled={disabled} onChange={e => updateLine(index, { manufacturer: e.target.value })} />
      <Input label="Model" value={item.model} disabled={disabled} onChange={e => updateLine(index, { model: e.target.value })} />
      <div className="sm:col-span-4"><Textarea label="Rincian teknis / pekerjaan yang termasuk harga" rows={2} value={item.technical_specs} disabled={disabled} onChange={e => updateLine(index, { technical_specs: e.target.value })} /></div>
      <p className="sm:col-span-3 text-sm font-semibold">Total: {money(Number(item.quantity || 0) * Number(item.unit_price || 0))}</p>
      {!disabled && <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...value, lineItems: value.lineItems.filter((_, i) => i !== index) })}>Hapus item</Button>}
    </div>)}
    {!disabled && <Button type="button" variant="secondary" onClick={() => onChange({ ...value, lineItems: [...value.lineItems, { sequence: Math.max(0, ...value.lineItems.map(i => i.sequence)) + 1, item_no: String(Math.max(0, ...value.lineItems.map(i => Number(i.item_no) || 0)) + 1).padStart(3, "0"), description: "", manufacturer: "", model: "", quantity: "1", uom: details.work_type === "services" ? "LOT" : "EA", unit_price: "0", technical_specs: "", item_kind: details.work_type === "services" ? "service" : "goods" }] })}>Tambah item BOQ</Button>}
    <p className="text-sm font-semibold">Jumlah BOQ: {money(total)}</p>
    <div className="sm:col-span-2"><Textarea label="Lingkup yang tidak dipesan / dikecualikan" rows={2} value={details.excluded_scope ?? ""} disabled={disabled} onChange={e => set("excluded_scope", e.target.value)} /></div>
  </>;
  if (step === 2) return <>
    <Input label="Nilai pekerjaan sebelum PPN" type="number" min="0" step="0.01" value={dppAmount} disabled={disabled} onChange={e => onDppChange(e.target.value)} />
    {!disabled && <Button type="button" variant="secondary" onClick={() => onDppChange(String(Math.round(total * 100) / 100))}>Gunakan jumlah BOQ: {money(total)}</Button>}
    {field("tax_amount", "PPN sesuai dokumen", "number")}
    {field("withholding_amount", "Potongan PPh sesuai dokumen", "number")}
    {field("withholding_basis", "Dasar potongan PPh / catatan Finance")}
    <div className="rounded-lg bg-slate-50 p-3 text-sm"><p>Total termasuk PPN: <strong>{money(gross)}</strong></p><p>Setelah potongan PPh: <strong>{money(gross - Number(details.withholding_amount || 0))}</strong></p></div>
    {field("source_total", "Total yang tertulis pada dokumen (opsional)", "number")}
    <Select label="Total dokumen tersebut" value={details.source_total_basis ?? "gross"} disabled={disabled} onChange={e => set("source_total_basis", e.target.value)}><option value="gross">Termasuk PPN, sebelum potongan</option><option value="net">Setelah potongan PPh</option></Select>
    <div className="sm:col-span-2 border-t pt-4 space-y-3">
      <p className="font-semibold text-sm">Termin pembayaran</p>
      <p className="text-xs text-slate-600">Template hanya titik awal. Sesuaikan persentase, bukti pencapaian, dan dasar tagihan dengan dokumen. Menyimpan termin tidak membuat invoice atau mencatat pembayaran.</p>
      {!disabled && <div className="flex flex-wrap gap-2">{Object.entries({ goods: "Barang 40–30–30", services: "Jasa 20–30–30–15–5", mixed: "Campuran 25–30–30–10–5" }).map(([key, label]) => <Button key={key} type="button" size="xs" variant="secondary" disabled={value.paymentTerms.length > 0} onClick={() => onChange({ ...value, paymentTerms: TEMPLATES[key].map(([percentage, trigger], i) => ({ sequence: i + 1, percentage: String(percentage), trigger, calculation_basis: "grand_total", due_date: "", status: "planned", invoice_no: "" })) })}>{label}</Button>)}</div>}
      {value.paymentTerms.map((term, index) => <div key={index} className="grid sm:grid-cols-4 gap-2 border rounded-lg p-3">
        <Input label="Persentase" type="number" min="0.01" max="100" step="0.01" value={term.percentage} disabled={disabled} onChange={e => onChange({ ...value, paymentTerms: value.paymentTerms.map((t, i) => i === index ? { ...t, percentage: e.target.value } : t) })} />
        <div className="sm:col-span-2"><Input label="Kondisi pembayaran & bukti yang diperlukan" value={term.trigger} disabled={disabled} onChange={e => onChange({ ...value, paymentTerms: value.paymentTerms.map((t, i) => i === index ? { ...t, trigger: e.target.value } : t) })} /></div>
        <Input label="Jatuh tempo (jika diketahui)" type="date" value={term.due_date} disabled={disabled} onChange={e => onChange({ ...value, paymentTerms: value.paymentTerms.map((t, i) => i === index ? { ...t, due_date: e.target.value } : t) })} />
        <Select label="Dasar persentase pada dokumen" value={term.calculation_basis} disabled={disabled} onChange={e => onChange({ ...value, paymentTerms: value.paymentTerms.map((t, i) => i === index ? { ...t, calculation_basis: e.target.value as "dpp" | "grand_total" } : t) })}><option value="grand_total">Total termasuk PPN</option><option value="dpp">DPP, kemudian ditambah PPN</option></Select>
        <p className="text-xs sm:col-span-2">Estimasi termasuk PPN: {money(gross * Number(term.percentage || 0) / 100)} · Potongan PPh diperiksa Finance saat penagihan.</p>
        {!disabled && <Button type="button" size="xs" variant="ghost" onClick={() => onChange({ ...value, paymentTerms: value.paymentTerms.filter((_, i) => i !== index) })}>Hapus termin</Button>}
      </div>)}
      {!disabled && <Button type="button" size="sm" variant="secondary" onClick={() => onChange({ ...value, paymentTerms: [...value.paymentTerms, { sequence: Math.max(0, ...value.paymentTerms.map(t => t.sequence)) + 1, percentage: "", trigger: "", calculation_basis: "grand_total", due_date: "", status: "planned", invoice_no: "" }] })}>Tambah termin</Button>}
      <p className="text-sm font-semibold">Total termin: {value.paymentTerms.reduce((sum, t) => sum + Number(t.percentage || 0), 0)}%</p>
    </div>
  </>;
  if (step === 3) return <>
    {field("delivery_term", "Ketentuan pengiriman, misalnya DDP")}{field("ship_to_location", "Lokasi pengiriman / pekerjaan")}
    {field("delivery_contact", "Kontak pengiriman")}{field("duration_text", "Durasi sesuai dokumen, misalnya 8–10 minggu")}
    <Select label="Durasi dihitung sejak" value={details.duration_trigger ?? ""} disabled={disabled} onChange={e => set("duration_trigger", e.target.value)}><option value="">Pilih sesuai dokumen</option><option value="po_received">PO diterima</option><option value="dp_received">DP diterima</option><option value="kickoff">Kickoff</option><option value="other">Lainnya, jelaskan di catatan</option></Select>
    {field("planned_start_date", "Rencana mulai", "date")}{field("target_completion_date", "Target selesai (rencana)", "date")}
    {field("actual_start_date", "Mulai aktual (berdasarkan bukti)", "date")}{field("actual_completion_date", "Selesai aktual (berdasarkan bukti)", "date")}
    {field("warranty_months", "Garansi (bulan; 0 jika tidak ada)", "number")}
    {field("warranty_start_event", "Garansi dimulai sejak, misalnya commissioning")}{field("warranty_start_date", "Tanggal kejadian awal garansi (jika sudah terjadi)", "date")}
    {field("billing_contact", "Kontak penagihan")}{field("billing_address", "Alamat penagihan")}
    <p className="sm:col-span-2 text-xs text-slate-600">Tanggal rencana tidak mengubah status pekerjaan menjadi selesai. Isi tanggal aktual hanya jika tersedia bukti pelaksanaan.</p>
  </>;
  if (step === 4) return <>
    <p className="sm:col-span-2 text-sm text-slate-600">Unggah dokumen asli dan pilih jenisnya. Lampiran tidak otomatis dibaca menjadi transaksi dan tidak menambah nilai kontrak.</p>
    <Select label="Jenis dokumen yang akan ditambahkan" value={documentKind} disabled={disabled} onChange={e => setDocumentKind(e.target.value)}>{Object.entries(DOCUMENT_KINDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select>
    {!disabled && <Input label="Tambah PDF (termasuk PDF tanpa ekstensi)" type="file" multiple onChange={e => { onPendingFilesChange([...pendingFiles, ...Array.from(e.target.files ?? []).map(file => ({ file, doc_type: documentKind }))]); e.target.value = ""; }} />}
    {existingAttachments.map(file => <div className="sm:col-span-2 flex flex-wrap gap-2 items-center border rounded-lg p-3" key={file.id}><button type="button" className="text-sm text-teal-800 flex-1 text-left break-all" onClick={() => onOpenAttachment(file)}>{DOCUMENT_KINDS[file.doc_type] ?? file.doc_type} · {file.original_filename}</button>{!disabled && <Button type="button" size="xs" variant="ghost" onClick={() => onDeleteAttachment(file)}>Hapus</Button>}</div>)}
    {pendingFiles.map((entry, index) => <div className="sm:col-span-2 grid sm:grid-cols-3 gap-2 items-center border rounded-lg p-3" key={index}><p className="text-xs break-all">{entry.file.name}</p><Select label="Jenis lampiran" value={entry.doc_type} disabled={disabled} onChange={e => onPendingFilesChange(pendingFiles.map((v, i) => i === index ? { ...v, doc_type: e.target.value } : v))}>{Object.entries(DOCUMENT_KINDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select><Button type="button" size="xs" variant="ghost" onClick={() => onPendingFilesChange(pendingFiles.filter((_, i) => i !== index))}>Batalkan unggah</Button></div>)}
    {!pendingFiles.length && !existingAttachments.length && <p className="sm:col-span-2 text-xs text-amber-800">Belum ada dokumen sumber. Anda tetap dapat menyimpan draf.</p>}
  </>;
  return null;
}
