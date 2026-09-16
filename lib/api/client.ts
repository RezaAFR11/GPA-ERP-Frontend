import axios from "axios";

// Browser requests stay on the frontend origin so the HttpOnly session cookie
// also works in browsers that block third-party cookies.
export const BASE_URL = "/api";
const upstreamApi = new URL(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api",
);

export interface TableSortParams {
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

export const authenticatedFilesApi = {
  fetch: (fileUrl: string) => {
    let url = `/${fileUrl.replace(/^\/+/, "")}`;
    if (/^https?:\/\//i.test(fileUrl)) {
      const parsed = new URL(fileUrl);
      const apiPath = upstreamApi.pathname.replace(/\/$/, "");
      if (parsed.origin === upstreamApi.origin && parsed.pathname.startsWith(`${apiPath}/`)) {
        url = `/api${parsed.pathname.slice(apiPath.length)}${parsed.search}`;
      } else if (parsed.origin === upstreamApi.origin && parsed.pathname.startsWith("/uploads/")) {
        url = `${parsed.pathname}${parsed.search}`;
      } else {
        url = fileUrl;
      }
    }
    // These paths already include /api or /uploads; don't prepend baseURL.
    return api.get<Blob>(url, { baseURL: "", responseType: "blob" });
  },
};

// Keep authentication expiry handling in one shared Axios instance.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.replace("/login");
    }
    return Promise.reject(error);
  },
);
