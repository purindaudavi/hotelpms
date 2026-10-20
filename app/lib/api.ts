import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import {
  clearAuthSession,
  readAccessToken,
  readRefreshToken,
  loadCurrentSessionUser,
  saveAccessToken
} from "./current-user";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3500/api";

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000
});

type RetriableConfig = InternalAxiosRequestConfig & { _authRetry?: boolean };

api.interceptors.request.use((config) => {
  if (!(config.url || "").startsWith("/auth/") && loadCurrentSessionUser().mode === "demo") {
    if ((config.method || "get").toUpperCase() !== "GET") {
      throw new axios.AxiosError("Demo workspace is read-only. Sign in to save changes.", "DEMO_READ_ONLY", config);
    }
    config.headers["x-demo-workspace"] = "1";
  }
  // Capture the property when the request is made, including raw file uploads.
  // Explicit API paths/parameters take precedence over the current page.
  const url = config.url || "";
  if (!url.startsWith("/auth/") && !/^\/properties\/?$/.test(url)) {
    const pathProperty = /^\/properties\/([^/]+)/.exec(url)?.[1];
    const pageProperty = typeof window !== "undefined" ? /^\/properties\/([^/]+)\//.exec(window.location.pathname)?.[1] : undefined;
    const id = pathProperty || config.params?.property_id || config.data?.property_id || pageProperty;
    if (id && !config.headers["x-property-id"]) config.headers["x-property-id"] = decodeURIComponent(id);
  }
  const token = readAccessToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error)) throw error;

    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const requestUrl = original?.url || "";
    const isAuthUtilityRequest = requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/refresh-token") ||
      requestUrl.includes("/auth/logout");

    const accessDenied = (error.response?.data as { code?: string } | undefined)?.code === "PROPERTY_ACCESS_DENIED";
    if (!original || original._authRetry || isAuthUtilityRequest || accessDenied || (status !== 401 && !(status === 403 && requestUrl === "/auth/me"))) {
      throw error;
    }

    const refreshToken = readRefreshToken();
    if (!refreshToken) {
      if (readAccessToken()) clearAuthSession();
      throw error;
    }

    try {
      original._authRetry = true;
      const response = await axios.post<{ token: string }>(
        `${apiBaseUrl}/auth/refresh-token`,
        { refreshToken },
        { headers: { "Content-Type": "application/json" } }
      );
      saveAccessToken(response.data.token);
      original.headers.Authorization = `Bearer ${response.data.token}`;
      return api(original);
    } catch (refreshError) {
      clearAuthSession();
      throw refreshError;
    }
  }
);

export function getApiErrorMessage(error: unknown, fallback = "Email could not be sent.") {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as { message?: unknown } | undefined;
  return typeof data?.message === "string" ? data.message : fallback;
}
