"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useQueryClient } from "@tanstack/react-query";
import {
  Upload, FileSpreadsheet, AlertTriangle,
  Loader2, X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { projectsApi } from "@/lib/api";
import { toastSuccess, toastError } from "@/lib/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import type { ProjectImportResult } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

type Stage = "idle" | "ready" | "uploading" | "done";

export default function ImportModal({ open, onClose }: Props) {
  const qc              = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<ProjectImportResult | null>(null);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) { setFile(accepted[0]); setStage("ready"); setResult(null); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    multiple: false,
  });

  async function handleUpload() {
    if (!file) return;
    setStage("uploading");
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 12, 85));
    }, 150);

    try {
      const { data } = await projectsApi.importFile(file);
      clearInterval(interval);
      setProgress(100);
      setResult(data);
      setStage("done");
      qc.invalidateQueries({ queryKey: ["projects"] });
      if (data.imported > 0) {
        toastSuccess(`Imported ${data.imported} project${data.imported > 1 ? "s" : ""}`,
          data.skipped > 0 ? `${data.skipped} skipped (already exist)` : undefined);
      }
    } catch (err) {
      clearInterval(interval);
      setStage("ready");
      setProgress(0);
      toastError("Import failed", getErrorMessage(err));
    }
  }

  function handleClose() {
    setFile(null); setStage("idle"); setResult(null); setProgress(0);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Projects"
      subtitle="Upload an Excel (.xlsx) or CSV file to bulk-import projects"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button
            variant="primary"
            icon={<Upload size={14} />}
            onClick={handleUpload}
            disabled={stage !== "ready"}
            loading={stage === "uploading"}
          >
            {stage === "uploading" ? "Uploading…" : "Import"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700">
          <strong>Required columns:</strong>{" "}
          <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">code</code>{" "}
          <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">name</code>{" "}
          <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">contract_value</code>
          {" "}· Optional:{" "}
          <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">start_date</code>{" "}
          <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">end_date</code>{" "}
          <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">status</code>
        </div>

        <div
          {...getRootProps()}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
            isDragActive
              ? "border-primary bg-primary-50 scale-[1.01]"
              : file
                ? "border-green-300 bg-green-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          )}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileSpreadsheet size={32} className="text-green-500" />
              <div>
                <p className="text-sm font-semibold text-gray-800">{file.name}</p>
                <p className="text-xs text-gray-400 num">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); setStage("idle"); }}
                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
              >
                <X size={11} /> Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <Upload size={20} className="text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {isDragActive ? "Drop it here!" : "Drag & drop your file here"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  or click to browse — .xlsx, .xls, .csv
                </p>
              </div>
            </div>
          )}
        </div>

        {stage === "uploading" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <Loader2 size={11} className="animate-spin" />
                Uploading {file?.name}
              </span>
              <span className="num font-medium">{progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {stage === "done" && result && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2.5 text-center">
                <p className="num text-xl font-bold text-green-600">{result.imported}</p>
                <p className="text-[10px] text-green-600 font-medium uppercase tracking-wide mt-0.5">Imported</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 text-center">
                <p className="num text-xl font-bold text-amber-600">{result.skipped}</p>
                <p className="text-[10px] text-amber-600 font-medium uppercase tracking-wide mt-0.5">Skipped</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 text-center">
                <p className="num text-xl font-bold text-red-600">{result.errors.length}</p>
                <p className="text-[10px] text-red-600 font-medium uppercase tracking-wide mt-0.5">Errors</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                    <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                    <span><span className="font-semibold">Row {e.row}:</span> {e.error}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
