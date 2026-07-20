import axios from "axios";

export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const BACKEND_ORIGIN = BASE_URL.replace(/\/api\/?$/, "");

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
    const url = fileUrl.startsWith("http")
      ? fileUrl
      : `${BACKEND_ORIGIN}/${fileUrl.replace(/^\/+/, "")}`;
    return api.get<Blob>(url, { responseType: "blob" });
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
