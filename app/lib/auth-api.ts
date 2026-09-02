import { api, getApiErrorMessage } from "./api";
import {
  clearAuthSession,
  normalizeSessionUser,
  readRefreshToken,
  saveAuthTokens,
  storeCurrentSessionUser,
  type SessionUser
} from "./current-user";

type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role: string;
  emp_no: string;
  mobile: string;
};

type LoginResponse = {
  token: string;
  refreshToken: string;
};

type MeResponse = {
  user: unknown;
};

type MessageResponse = {
  message: string;
};

export async function loginUser(input: LoginInput) {
  const response = await api.post<LoginResponse>("/auth/login", input);
  saveAuthTokens(response.data.token, response.data.refreshToken);

  const user = await getAuthenticatedUser();
  storeCurrentSessionUser(user);
  return user;
}

export async function registerUser(input: RegisterInput) {
  const response = await api.post<MessageResponse>("/auth/register", input);
  return response.data.message || "User created successfully";
}

export async function getAuthenticatedUser(): Promise<SessionUser> {
  const response = await api.get<MeResponse>("/auth/me");
  return normalizeSessionUser(response.data.user);
}

export async function resetPassword(currentPassword: string, newPassword: string) {
  const response = await api.post<MessageResponse>("/auth/reset-password", {
    currentPassword,
    newPassword
  });
  return response.data.message || "Password reset successfully";
}

export async function logoutUser() {
  const refreshToken = readRefreshToken();
  try {
    if (refreshToken) {
      await api.post<MessageResponse>("/auth/logout", { refreshToken });
    }
  } finally {
    clearAuthSession();
  }
}

export function getAuthErrorMessage(error: unknown, fallback = "Authentication request failed.") {
  return getApiErrorMessage(error, fallback);
}
