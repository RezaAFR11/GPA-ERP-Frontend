"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadGooglePlaces, type SelectedPlace } from "@/lib/google-places";

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

function GoogleAddressSearch({ onChange }: Pick<Props, "onChange">) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Memuat pencarian Google Maps…");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const configured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim());

  useEffect(() => {
    if (!configured) return;
    let active = true;
    let version = 0;
    let widget: HTMLElement | undefined;
    setError("");
    setStatus("Memuat pencarian Google Maps…");

    const invalidate = () => {
      version += 1;
      onChange(null);
      setError("");
      setStatus("");
    };
    const failed = () => {
      version += 1;
      onChange(null);
      setStatus("");
      setError("Pencarian Google Maps tidak tersedia. Coba lagi atau gunakan lokasi saat ini.");
    };
    const selected = async (event: Event) => {
      const request = ++version;
      onChange(null);
      setError("");
      setStatus("Mengambil lokasi…");
      try {
        const { placePrediction } = event as Event & {
          placePrediction: { toPlace(): SelectedPlace };
        };
        const place = placePrediction.toPlace();
        await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });
        if (!active || request !== version) return;
        const latitude = place.location?.lat();
        const longitude = place.location?.lng();
        if (latitude === undefined || longitude === undefined || !validPoint(latitude, longitude)) {
          throw new Error("Lokasi tidak memiliki titik yang valid. Pilih hasil lain.");
        }
        onChange({ latitude, longitude, label: place.formattedAddress || place.displayName || "Lokasi terpilih" });
        setStatus("");
      } catch {
        if (active && request === version) failed();
      }
    };

    loadGooglePlaces().then(({ PlaceAutocompleteElement }) => {
      if (!active || !container.current) return;
      widget = new PlaceAutocompleteElement({ includedRegionCodes: ["id"] });
      widget.setAttribute("placeholder", "Cari nama kantor, site, atau alamat");
      widget.setAttribute("aria-label", "Cari alamat di Google Maps");
      widget.style.width = "100%";
      widget.addEventListener("gmp-select", selected);
      widget.addEventListener("gmp-error", failed);
      widget.addEventListener("input", invalidate);
      container.current.replaceChildren(widget);
      setStatus("");
    }).catch(() => { if (active) failed(); });
    return () => {
      active = false;
      widget?.removeEventListener("gmp-select", selected);
      widget?.removeEventListener("gmp-error", failed);
      widget?.removeEventListener("input", invalidate);
      widget?.remove();
    };
  }, [attempt, configured, onChange]);

  if (!configured) return (
    <p className="text-sm text-amber-700" role="status">
      Pencarian Google Maps belum diaktifkan. Gunakan lokasi saat ini atau hubungi administrator.
    </p>
  );
  return (
    <div className="space-y-2">
      <div ref={container} />
      <p className="text-xs text-gray-500">Ketik alamat lalu pilih salah satu hasil Google Maps.</p>
      {status && <p className="text-xs text-gray-500" role="status">{status}</p>}
      {error && <div role="alert" className="space-y-2 text-xs text-red-600">
        <p>{error}</p>
        <Button type="button" size="sm" onClick={() => { onChange(null); setAttempt(value => value + 1); }}>Coba lagi</Button>
      </div>}
    </div>
  );
}

export function WorkLocationPicker({ onChange, disabled = false }: Props) {
  const [mode, setMode] = useState<"current" | "search">("current");
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
          ["search", "Cari alamat di Google Maps", Search],
        ] as const).map(([value, label, Icon]) => (
          <label key={value} className={`flex items-center gap-2 border rounded-lg p-3 text-xs cursor-pointer ${mode === value ? "border-teal-600 bg-teal-50 text-teal-800" : "border-gray-200 text-gray-600"}`}>
            <input type="radio" name="work-location-source" value={value} checked={mode === value}
              onChange={() => {
                requestId.current += 1;
                setMode(value); setPoint(null); onChange(null); setError(""); setBusy(false);
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
      ) : <GoogleAddressSearch onChange={onChange} />}
    </fieldset>
  );
}
