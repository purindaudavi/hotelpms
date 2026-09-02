import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import {
  clearAuthSession,
  readAccessToken,
  readRefreshToken,
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

    if (!original || original._authRetry || isAuthUtilityRequest || (status !== 401 && status !== 403)) {
      throw error;
    }

    const refreshToken = readRefreshToken();
    if (!refreshToken) {
      clearAuthSession();
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
