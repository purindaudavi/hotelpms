import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3500/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15_000
});

export function getApiErrorMessage(error: unknown, fallback = "Email could not be sent.") {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as { message?: unknown } | undefined;
  return typeof data?.message === "string" ? data.message : fallback;
}
