export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  empNo: string;
  mobile: string;
  mode?: "authenticated" | "demo";
};

export const authSessionStorageKey = "staypilot-session";
export const accessTokenStorageKey = "staypilot-access-token";
export const refreshTokenStorageKey = "staypilot-refresh-token";

const fallbackSessionUser: SessionUser = {
  id: "demo-user",
  name: "ASIRI PERERA",
  email: "asiri.business@gmail.com",
  role: "Owner / Administrator",
  empNo: "01",
  mobile: "070 355 1339",
  mode: "demo"
};

export const currentSessionUser: SessionUser = { ...fallbackSessionUser };

export function normalizeSessionUser(value: unknown): SessionUser {
  if (!value || typeof value !== "object") return { ...fallbackSessionUser };

  const record = value as Record<string, unknown>;
  const email = text(record.email) || fallbackSessionUser.email;
  const name = text(record.name) || email.split("@")[0] || fallbackSessionUser.name;

  return {
    id: text(record._id) || text(record.id) || email,
    name,
    email,
    role: text(record.role) || fallbackSessionUser.role,
    empNo: text(record.emp_no) || text(record.empNo) || "",
    mobile: text(record.mobile) || "",
    mode: record.mode === "demo" ? "demo" : "authenticated"
  };
}

export function updateCurrentSessionUser(user: SessionUser) {
  Object.assign(currentSessionUser, user);
  return currentSessionUser;
}

export function loadCurrentSessionUser() {
  if (typeof window === "undefined") {
    return updateCurrentSessionUser({ ...fallbackSessionUser });
  }

  const session = parseJson(window.localStorage.getItem(authSessionStorageKey));
  const user = normalizeSessionUser(
    session && typeof session === "object" && "user" in session
      ? (session as { user?: unknown }).user
      : session
  );

  return updateCurrentSessionUser(user);
}

export function storeCurrentSessionUser(user: SessionUser) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      authSessionStorageKey,
      JSON.stringify({ user, mode: user.mode ?? "authenticated" })
    );
  }
  return updateCurrentSessionUser(user);
}

export function storeDemoSession() {
  const user = { ...fallbackSessionUser, mode: "demo" as const };
  return storeCurrentSessionUser(user);
}

export function readAccessToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(accessTokenStorageKey) || "";
}

export function readRefreshToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(refreshTokenStorageKey) || "";
}

export function saveAccessToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(accessTokenStorageKey, token);
  }
}

export function saveAuthTokens(token: string, refreshToken: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(accessTokenStorageKey, token);
    window.localStorage.setItem(refreshTokenStorageKey, refreshToken);
  }
}

export function clearAuthSession() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(authSessionStorageKey);
    window.localStorage.removeItem(accessTokenStorageKey);
    window.localStorage.removeItem(refreshTokenStorageKey);
  }
  return updateCurrentSessionUser({ ...fallbackSessionUser });
}

export function hasStoredWorkspaceSession() {
  if (typeof window === "undefined") return false;
  const session = parseJson(window.localStorage.getItem(authSessionStorageKey));
  const mode = session && typeof session === "object"
    ? (session as Record<string, unknown>).mode
    : undefined;
  return mode === "demo" || Boolean(readAccessToken() || readRefreshToken());
}

export function getUserInitials(user: Pick<SessionUser, "name" | "email">) {
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return initials || user.email.slice(0, 2).toUpperCase() || "SP";
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
