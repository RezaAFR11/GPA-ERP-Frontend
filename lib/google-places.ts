// Minimal contracts for the Google Places widget loaded on demand.
export interface SelectedPlace {
  displayName?: string;
  formattedAddress?: string;
  location?: { lat(): number; lng(): number };
  fetchFields(options: { fields: string[] }): Promise<unknown>;
}

interface PlacesLibrary {
  PlaceAutocompleteElement: new (options: {
    includedRegionCodes: string[];
  }) => HTMLElement;
}

type MapsWindow = Window & {
  google?: { maps: { importLibrary(name: "places"): Promise<PlacesLibrary> } };
  gpaPlacesReady?: () => void;
};

let placesPromise: Promise<PlacesLibrary> | undefined;

export function loadGooglePlaces(): Promise<PlacesLibrary> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key) return Promise.reject(new Error("Pencarian Google Maps belum tersedia."));
  if (placesPromise) return placesPromise;

  const mapsWindow = window as MapsWindow;
  placesPromise = new Promise<PlacesLibrary>((resolve, reject) => {
    if (mapsWindow.google?.maps.importLibrary) {
      mapsWindow.google.maps.importLibrary("places").then(resolve, reject);
      return;
    }
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => fail(), 20000);
    const fail = () => {
      window.clearTimeout(timeout);
      script.remove();
      reject(new Error("Google Maps gagal dimuat. Periksa koneksi lalu coba lagi."));
    };
    mapsWindow.gpaPlacesReady = () => {
      window.clearTimeout(timeout);
      if (!mapsWindow.google?.maps.importLibrary) { fail(); return; }
      mapsWindow.google.maps.importLibrary("places").then(resolve, reject);
    };
    const params = new URLSearchParams({
      key, loading: "async", callback: "gpaPlacesReady", v: "weekly",
      language: "id", region: "ID",
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    placesPromise = undefined;
    throw error;
  });
  return placesPromise;
}
