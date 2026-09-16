interface Coordinates {
  latitude: number;
  longitude: number;
}

type ParseResult = { point: Coordinates; error?: never } | { point?: never; error: string };

function coordinatePair(value: string): Coordinates | null {
  const trimmed = value.trim();
  const pair = trimmed.startsWith("(") && trimmed.endsWith(")") ? trimmed.slice(1, -1) : trimmed;
  const match = pair.match(/^\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90
    || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

// Parse locally: never fetch pasted URLs or call Google APIs.
export function parseGoogleMapsCoordinates(input: string): ParseResult {
  const value = input.trim();
  const point = coordinatePair(value);
  if (point) return { point };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { error: "Tempel dua angka koordinat dipisahkan koma, contoh: 1.999191006171762, 117.73438784788873." };
  }
  if (!['https:', 'http:'].includes(url.protocol)) {
    return { error: "Gunakan link Google Maps atau pasangan koordinat yang disalin dari peta." };
  }
  if (url.hostname === "maps.app.goo.gl" || (url.hostname === "goo.gl" && url.pathname.startsWith("/maps"))) {
    return { error: "Link pendek belum memuat koordinat. Buka link di Google Maps, klik kanan titik tujuan, lalu salin angka koordinat dan tempel di sini." };
  }
  const isMapsHost = ["google.com", "www.google.com", "maps.google.com", "google.co.id", "www.google.co.id", "maps.google.co.id"].includes(url.hostname);
  const isMapsPath = url.hostname.startsWith("maps.") || /^\/maps(?:\/|$)/.test(url.pathname);
  if (!isMapsHost || !isMapsPath || url.pathname.startsWith("/maps/dir")) {
    return { error: "Tempel link titik lokasi Google Maps, bukan link rute, atau salin pasangan koordinat dari peta." };
  }
  for (const key of ["query", "q"]) {
    const pair = coordinatePair(url.searchParams.get(key) ?? "");
    if (pair) return { point: pair };
  }
  // The place marker is !3d/!4d. An @lat,lng segment is only the camera centre
  // and can differ from the selected workplace, so it must not be used.
  try {
    const marker = decodeURIComponent(url.pathname + url.search).match(/!3d([+-]?\d+(?:\.\d+)?)!4d([+-]?\d+(?:\.\d+)?)(?=!|&|$)/);
    if (marker) {
      const pair = coordinatePair(`${marker[1]},${marker[2]}`);
      if (pair) return { point: pair };
    }
  } catch { /* Malformed URL encoding: ask for the coordinates instead. */ }
  return { error: "Link ini tidak memuat koordinat titik yang jelas. Klik kanan titik di Google Maps, salin angka koordinat, lalu tempel di sini." };
}
