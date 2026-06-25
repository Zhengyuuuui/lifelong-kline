const rawApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "");
const apiBaseUrl = rawApiBaseUrl.replace(/\/$/, "");

const SESSION_TOKEN_KEY = "life_kline_session_token";
const REFRESH_TOKEN_KEY = "life_kline_refresh_token";
export const AUTH_INVALIDATED_EVENT = "life-kline:auth-invalidated";

type AuthTokens = {
  accessToken?: string;
  refreshToken?: string;
  sessionToken?: string;
};

const readLocalStorage = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeLocalStorage = (key: string, value?: string | null) => {
  try {
    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Private browsing and storage policies can make localStorage unavailable.
  }
};

export const getSessionToken = () => readLocalStorage(SESSION_TOKEN_KEY);

export const getRefreshToken = () => readLocalStorage(REFRESH_TOKEN_KEY);

export const isJwtToken = (token?: string | null) =>
  Boolean(token && token.split(".").length === 3);

export const hasJwtAuthToken = () =>
  isJwtToken(getSessionToken()) || isJwtToken(getRefreshToken());

export const hasAuthTokens = () => hasJwtAuthToken();

export const setAuthTokens = (tokens: AuthTokens) => {
  const accessToken = tokens.accessToken ||
    (isJwtToken(tokens.sessionToken) ? tokens.sessionToken : undefined);
  if (accessToken) {
    writeLocalStorage(SESSION_TOKEN_KEY, accessToken);
  } else if (tokens.accessToken !== undefined || tokens.sessionToken !== undefined) {
    writeLocalStorage(SESSION_TOKEN_KEY);
  }
  if (tokens.refreshToken !== undefined) {
    writeLocalStorage(
      REFRESH_TOKEN_KEY,
      isJwtToken(tokens.refreshToken) ? tokens.refreshToken : undefined
    );
  }
};

export const clearAuthTokens = () => {
  writeLocalStorage(SESSION_TOKEN_KEY);
  writeLocalStorage(REFRESH_TOKEN_KEY);
};

const notifyAuthInvalidated = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_INVALIDATED_EVENT));
  }
};

const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!isJwtToken(refreshToken)) return false;

  const response = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ refreshToken }),
  }).catch(() => null);

  if (!response?.ok) {
    clearAuthTokens();
    return false;
  }

  const payload = await response.json().catch(() => ({}));
  setAuthTokens({
    accessToken: payload.accessToken || payload.sessionToken,
    refreshToken: payload.refreshToken,
  });
  return Boolean(payload.accessToken || payload.sessionToken);
};

export const apiFetch = async (path: string, init: RequestInit = {}) => {
  const createHeaders = () => {
    const headers = new Headers(init.headers);
    const sessionToken = getSessionToken();
    if (isJwtToken(sessionToken)) headers.set("Authorization", `Bearer ${sessionToken}`);
    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return headers;
  };

  const request = () =>
    fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: createHeaders(),
      credentials: "include",
    });

  let response = await request();
  const canRefresh = ![
    "/api/auth/refresh",
    "/api/auth/logout",
    "/api/auth/sms/send",
    "/api/auth/register/phone",
    "/api/auth/password/login",
    "/api/auth/apple",
    "/api/auth/wechat",
  ].includes(path);
  if (
    response.status === 401 &&
    canRefresh &&
    isJwtToken(getRefreshToken()) &&
    await refreshAccessToken()
  ) {
    response = await request();
  }
  if (response.status === 401) {
    clearAuthTokens();
    if (path === "/api/user/me") notifyAuthInvalidated();
  }
  return response;
};

export const apiJson = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await apiFetch(path, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `HTTP ${response.status}`;
    const error = new Error(message) as Error & { status?: number; payload?: unknown };
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload as T;
};
