"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle, Loader2, MapPin, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { hrisAttendanceApi } from "@/lib/api";
import type { AttendanceRecord, Employee } from "@/lib/types";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
type Step = "geo" | "camera" | "preview" | "submitting" | "done" | "error";

interface Props {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSuccess: (record: AttendanceRecord) => void;
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function fmtCoords(lat: number, lon: number) {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

/* ─── Main component ─────────────────────────────────────────────────────────── */
export function ClockInModal({ open, onClose, employee, onSuccess }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep]       = useState<Step>("geo");
  const [geo, setGeo]         = useState<{ lat: number; lon: number; acc: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfieUrl,  setSelfieUrl]  = useState<string | null>(null);
  const [result, setResult]   = useState<AttendanceRecord | null>(null);
  const [errMsg, setErrMsg]   = useState<string | null>(null);
  const [note, setNote]       = useState("");

  /* reset on open */
  useEffect(() => {
    if (open) {
      setStep("geo");
      setGeo(null);
      setGeoError(null);
      setSelfieBlob(null);
      setSelfieUrl(null);
      setResult(null);
      setErrMsg(null);
      setNote("");
      requestGeo();
    } else {
      stopCamera();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ── Geolocation ─────────────────────────────────────────────────────────── */
  function requestGeo() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation tidak didukung perangkat ini");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy });
        setGeoError(null);
      },
      (err) => {
        setGeoError(`GPS error: ${err.message}. Anda tetap bisa clock-in tanpa lokasi.`);
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
    );
  }

  /* ── Camera ──────────────────────────────────────────────────────────────── */
  async function startCamera() {
    setStep("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setStep("error");
      setErrMsg("Tidak bisa mengakses kamera. Pastikan izin kamera diberikan.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  const takeSelfie = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setSelfieBlob(blob);
        setSelfieUrl(canvas.toDataURL("image/jpeg", 0.85));
        stopCamera();
        setStep("preview");
      },
      "image/jpeg",
      0.85
    );
  }, []);

  /* ── Submit ──────────────────────────────────────────────────────────────── */
  async function submit() {
    if (!employee) return;
    setStep("submitting");
    try {
      const selfieFile = selfieBlob
        ? new File([selfieBlob], "selfie.jpg", { type: "image/jpeg" })
        : undefined;

      const res = await hrisAttendanceApi.clockIn({
        employee_id: employee.id,
        latitude:  geo?.lat,
        longitude: geo?.lon,
        accuracy:  geo?.acc,
        note:      note || undefined,
        selfie:    selfieFile,
      });
      setResult(res.data);
      setStep("done");
      onSuccess(res.data);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Clock-in gagal. Coba lagi.";
      setErrMsg(detail);
      setStep("error");
    }
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */
  const empName = employee?.full_name ?? "—";
  const empNo   = employee?.employee_no ?? "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Clock-In"
      subtitle={`${empName} · ${empNo}`}
      size="md"
    >
      {/* STEP: Geo */}
      {step === "geo" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <MapPin size={16} className="text-teal-600" />
              Lokasi GPS
            </div>
            {geo ? (
              <p className="text-xs text-teal-700 font-mono">
                {fmtCoords(geo.lat, geo.lon)}
                <span className="ml-2 text-gray-400">±{geo.acc.toFixed(0)} m</span>
              </p>
            ) : geoError ? (
              <p className="text-xs text-amber-600">{geoError}</p>
            ) : (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> Mendapatkan lokasi…
              </p>
            )}
            {(geoError) && (
              <button
                onClick={requestGeo}
                className="text-xs text-teal-600 underline"
              >
                Coba lagi
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Catatan (opsional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. WFH, visit client…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Batal</Button>
            <Button onClick={startCamera} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Camera size={14} className="mr-1.5" /> Buka Kamera
            </Button>
          </div>
        </div>
      )}

      {/* STEP: Camera */}
      {step === "camera" && (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Face guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-44 h-56 rounded-full border-4 border-white/60 border-dashed" />
            </div>
            <p className="absolute bottom-3 left-0 right-0 text-center text-white text-xs drop-shadow">
              Posisikan wajah di dalam lingkaran
            </p>
          </div>
          <canvas ref={canvasRef} className="hidden" />

          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => { stopCamera(); setStep("geo"); }}>
              Kembali
            </Button>
            <Button onClick={takeSelfie} className="bg-teal-600 hover:bg-teal-700 text-white px-8">
              <Camera size={14} className="mr-1.5" /> Ambil Selfie
            </Button>
          </div>
        </div>
      )}

      {/* STEP: Preview */}
      {step === "preview" && selfieUrl && (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden bg-black aspect-[4/3]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selfieUrl} alt="selfie preview" className="w-full h-full object-cover" />
          </div>

          {geo && (
            <div className="flex items-center gap-2 rounded-lg bg-teal-50 border border-teal-100 px-3 py-2">
              <MapPin size={14} className="text-teal-600 shrink-0" />
              <span className="text-xs text-teal-700 font-mono">
                {fmtCoords(geo.lat, geo.lon)} <span className="text-gray-400">±{geo.acc.toFixed(0)} m</span>
              </span>
            </div>
          )}

          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => { startCamera(); }}>
              Ulangi
            </Button>
            <Button onClick={submit} className="bg-teal-600 hover:bg-teal-700 text-white px-8">
              Kirim Clock-In
            </Button>
          </div>
        </div>
      )}

      {/* STEP: Submitting */}
      {step === "submitting" && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 size={36} className="animate-spin text-teal-600" />
          <p className="text-sm text-gray-500">Memproses clock-in…</p>
        </div>
      )}

      {/* STEP: Done */}
      {step === "done" && result && (
        <div className="flex flex-col items-center text-center py-8 gap-4">
          <CheckCircle size={48} className="text-teal-500" />
          <div>
            <p className="text-lg font-bold text-gray-900">Clock-In Berhasil!</p>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(result.clock_in!).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              {" · "}
              {result.face_verified ? (
                <span className="text-teal-600 font-medium">✓ Wajah Terverifikasi ({((result.face_confidence ?? 0) * 100).toFixed(0)}%)</span>
              ) : (
                <span className="text-amber-600 font-medium">⚠ Verifikasi wajah gagal — HR akan review</span>
              )}
            </p>
            {result.latitude && result.longitude && (
              <p className="text-xs text-gray-400 mt-1 font-mono">
                {fmtCoords(result.latitude, result.longitude)}
              </p>
            )}
          </div>
          <Button onClick={onClose} className="bg-teal-600 hover:bg-teal-700 text-white px-8 mt-2">
            Tutup
          </Button>
        </div>
      )}

      {/* STEP: Error */}
      {step === "error" && (
        <div className="flex flex-col items-center text-center py-8 gap-4">
          <XCircle size={48} className="text-red-400" />
          <div>
            <p className="text-lg font-bold text-gray-900">Terjadi Kesalahan</p>
            <p className="text-sm text-red-500 mt-1">{errMsg}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Tutup</Button>
            <Button onClick={() => setStep("geo")} className="bg-teal-600 hover:bg-teal-700 text-white">
              Coba Lagi
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
