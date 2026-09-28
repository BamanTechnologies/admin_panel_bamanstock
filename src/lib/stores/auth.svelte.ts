import { browser } from '$app/environment';
import { jwtDecode } from 'jwt-decode';

/** The only Hasura role permitted to reach the admin panel. */
export const ADMIN_ROLE = 'super:admin';

export const AUTH_TOKEN_KEY = 'admin_auth_token';

const logoutListeners = new Set<() => void>();
const loginListeners = new Set<() => void>();

export type JwtPayload = {
  sub: string;
  name: string;
  email: string | null;
  phone: string | null;
  profile_picture: string | null;
  metadata: {
    'x-hasura-default-role': string;
    'x-hasura-allowed-roles': string[];
    'x-hasura-user-id': string;
    [key: string]: unknown;
  };
  exp: number;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string;
  role: string;
  allowedRoles: string[];
};

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
}

export function hasAdminRole(payload: JwtPayload | null): boolean {
  if (!payload) return false;
  const allowed = payload.metadata?.['x-hasura-allowed-roles'] ?? [];
  return allowed.includes(ADMIN_ROLE);
}

/**
 * Why a session was rejected. The route middleware uses this to decide between
 * a silent bounce, a "session expired" warning, and an explicit permission error.
 */
export type SessionRejection = 'missing' | 'invalid' | 'expired' | 'forbidden';

export type SessionCheck =
  | { ok: true; payload: JwtPayload; user: AuthUser }
  | { ok: false; reason: SessionRejection };

/**
 * Single source of truth for "may this session see admin pages?".
 *
 * Deliberately re-decodes the token instead of trusting the cached `user`, so a
 * token that was tampered with or has since expired can never be waved through
 * on the strength of a stale in-memory session.
 */
export function validateSession(): SessionCheck {
  if (!browser) return { ok: false, reason: 'missing' };

  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return { ok: false, reason: 'missing' };

  const payload = decodeToken(token);
  if (!payload || typeof payload.exp !== 'number') {
    return { ok: false, reason: 'invalid' };
  }

  if (payload.exp * 1000 < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  if (!hasAdminRole(payload)) {
    return { ok: false, reason: 'forbidden' };
  }

  return {
    ok: true,
    payload,
    user: {
      id: payload.sub,
      name: payload.name,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      avatar: payload.profile_picture ?? '',
      role: payload.metadata['x-hasura-default-role'],
      allowedRoles: payload.metadata['x-hasura-allowed-roles'] ?? [],
    },
  };
}

function createAuthStore() {
  let user = $state<AuthUser | null>(null);

  function decodeAndSetUser(token: string): boolean {
    const payload = decodeToken(token);
    if (!payload || !hasAdminRole(payload) || isTokenExpired(token)) {
      user = null;
      return false;
    }

    user = {
      id: payload.sub,
      name: payload.name,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      avatar: payload.profile_picture ?? '',
      role: payload.metadata['x-hasura-default-role'],
      allowedRoles: payload.metadata['x-hasura-allowed-roles'] ?? [],
    };
    return true;
  }

  function getToken(): string | null {
    if (!browser) return null;
    return localStorage.getItem(AUTH_TOKEN_KEY) ?? null;
  }

  function isTokenExpired(token: string | null = getToken()): boolean {
    if (!token) return true;
    const payload = decodeToken(token);
    if (!payload) return true;
    return payload.exp * 1000 < Date.now();
  }

  function init() {
    if (!browser) return;
    const token = getToken();
    if (!token) {
      user = null;
      return;
    }
    if (!decodeAndSetUser(token)) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }

  /**
   * Persists the token only when the JWT carries the admin role. Returns the
   * decoded payload on success, or null when the token is rejected.
   */
  function loginWithToken(token: string): JwtPayload | null {
    if (!browser) return null;

    const payload = decodeToken(token);
    if (!payload) return null;
    if (!hasAdminRole(payload)) return null;
    if (isTokenExpired(token)) return null;

    localStorage.setItem(AUTH_TOKEN_KEY, token);
    decodeAndSetUser(token);
    loginListeners.forEach((fn) => fn());
    return payload;
  }

  function logout() {
    const hadSession = user !== null;
    user = null;
    if (browser) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
    if (hadSession) {
      logoutListeners.forEach((fn) => fn());
    }
  }

  function onLogout(listener: () => void) {
    logoutListeners.add(listener);
    return () => logoutListeners.delete(listener);
  }

  function onLogin(listener: () => void) {
    loginListeners.add(listener);
    return () => loginListeners.delete(listener);
  }

  return {
    get user() { return user; },
    get isAuthenticated() { return user !== null; },
    getToken,
    isTokenExpired,
    init,
    loginWithToken,
    logout,
    onLogout,
    onLogin,
  };
}

export const authStore = createAuthStore();
