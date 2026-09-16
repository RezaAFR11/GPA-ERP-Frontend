"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, LocateFixed, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseGoogleMapsCoordinates } from "./google-maps-coordinates";

export interface LocationPoint {
  latitude: number;
  longitude: number;
  label: string;
  accuracy?: number;
}

interface Props {
  onChange: (point: LocationPoint | null) => void;
  disabled?: boolean;
}

function validPoint(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

export function WorkLocationPicker({ onChange, disabled = false }: Props) {
  const [mode, setMode] = useState<"current" | "paste">("current");
  const [mapsInput, setMapsInput] = useState("");
  const [point, setPoint] = useState<LocationPoint | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  // Ignore late GPS responses after closing the form or changing source.
  useEffect(() => () => { requestId.current += 1; }, []);

  function requestCurrentLocation() {
    const request = ++requestId.current;
    setPoint(null);
    onChange(null);
    setError("");
    if (!navigator.geolocation || !window.isSecureContext) {
      setError("Lokasi perangkat tidak tersedia. Gunakan HTTPS dan browser yang mendukung lokasi.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(position => {
      if (request !== requestId.current) return;
      setBusy(false);
      const { latitude, longitude, accuracy } = position.coords;
      if (!validPoint(latitude, longitude)) {
        setError("Titik lokasi tidak valid. Silakan ambil ulang lokasi.");
        return;
      }
      const next = { latitude, longitude, accuracy, label: "Lokasi perangkat saat ini" };
      setPoint(next);
      onChange(next);
    }, failure => {
      if (request !== requestId.current) return;
      setBusy(false);
      setError(failure.code === 1
        ? "Izin lokasi ditolak. Aktifkan izin lokasi di browser, lalu coba lagi."
        : failure.code === 3
          ? "Pengambilan lokasi terlalu lama. Coba lagi di tempat dengan sinyal GPS lebih baik."
          : "Lokasi belum ditemukan. Aktifkan layanan lokasi perangkat lalu coba lagi.");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="text-xs font-medium text-gray-600 mb-2">Tentukan Lokasi</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {([
          ["current", "Lokasi saat ini", LocateFixed],
          ["paste", "Tempel titik Google Maps", MapPin],
        ] as const).map(([value, label, Icon]) => (
          <label key={value} className={`flex items-center gap-2 border rounded-lg p-3 text-xs cursor-pointer ${mode === value ? "border-teal-600 bg-teal-50 text-teal-800" : "border-gray-200 text-gray-600"}`}>
            <input type="radio" name="work-location-source" value={value} checked={mode === value}
              onChange={() => {
                requestId.current += 1;
                setMode(value); setMapsInput(""); setPoint(null); onChange(null); setError(""); setBusy(false);
              }} />
            <Icon size={16} aria-hidden="true" />{label}
          </label>
        ))}
      </div>
      {mode === "current" ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Pastikan Anda berada di kantor atau site yang akan didaftarkan, lalu izinkan akses lokasi.</p>
          <Button type="button" size="sm" loading={busy} icon={<LocateFixed size={14} />} onClick={requestCurrentLocation}>
            {point ? "Ambil ulang lokasi" : "Gunakan lokasi saat ini"}
          </Button>
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          {point && <div className="rounded-lg bg-teal-50 p-3 text-xs text-teal-800" role="status">
            <p>Lokasi perangkat berhasil dipilih. Perkiraan akurasi: ±{Math.round(point.accuracy ?? 0)} meter.</p>
            <p>Periksa titik pada peta sebelum menyimpan, terutama jika akurasi lebih besar dari radius absensi.</p>
          </div>}
        </div>
      ) : (
        <div className="space-y-3">
          <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 underline">
            <ExternalLink size={14} aria-hidden="true" />Buka Google Maps
          </a>
          <p id="maps-point-help" className="text-xs text-gray-500">
            Cari kantor atau site, klik kanan titik yang tepat, lalu klik angka koordinat paling atas untuk menyalinnya. Tempel hasilnya di bawah.
          </p>
          <div>
            <label htmlFor="maps-point-input" className="block text-xs font-medium text-gray-600 mb-1">
              Koordinat atau link titik Google Maps
            </label>
            <textarea id="maps-point-input" rows={2} value={mapsInput}
              aria-describedby={`maps-point-help${error ? " maps-point-error" : ""}`}
              aria-invalid={Boolean(error)}
              placeholder="1.999191006171762, 117.73438784788873"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              onChange={event => {
                const value = event.target.value;
                setMapsInput(value);
                setPoint(null);
                onChange(null);
                setError("");
                if (!value.trim()) return;
                const result = parseGoogleMapsCoordinates(value);
                if (!result.point) { setError(result.error); return; }
                const next = { ...result.point, label: "Titik dari Google Maps" };
                setPoint(next);
                onChange(next);
              }} />
            <p className="text-xs text-gray-500 mt-1">Tempel kedua angka sekaligus, dipisahkan koma. Link pendek perlu dibuka dahulu untuk menyalin koordinatnya.</p>
          </div>
          {error && <p id="maps-point-error" role="alert" className="text-xs text-red-600">{error}</p>}
          {point && <p role="status" className="text-xs text-teal-700">Titik berhasil dibaca. Periksa tautan peta di bawah sebelum menyimpan.</p>}
        </div>
      )}
    </fieldset>
  );
}
