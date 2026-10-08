/**
 * Route classification for the admin panel middleware.
 *
 * Kept free of Svelte runes so it can be imported from any `+page.ts` / `+layout.ts`
 * load function as well as from component scripts.
 */

/** The only routes reachable without a valid admin session. */
export const PUBLIC_PATHS = ['/admin/login', '/admin/forgot-password', '/admin/reset-password'];

export const LOGIN_PATH = '/admin/login';
export const FORGOT_PASSWORD_PATH = '/admin/forgot-password';
export const RESET_PASSWORD_PATH = '/admin/reset-password';
export const DEFAULT_AUTHENTICATED_PATH = '/admin/dashboard';

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Rejects protocol-relative and cross-origin targets so `?redirect=` can't be used for phishing. */
export function safeRedirectTarget(
  target: string | null,
  fallback: string = DEFAULT_AUTHENTICATED_PATH
): string {
  if (!target) return fallback;
  if (!target.startsWith('/')) return fallback;
  if (target.startsWith('//')) return fallback;
  if (target === LOGIN_PATH || target.startsWith(`${LOGIN_PATH}/`)) return fallback;
  return target;
}

export function loginUrlFor(pathname: string, search: string): string {
  const returnTo = `${pathname}${search}`;
  return `${LOGIN_PATH}?redirect=${encodeURIComponent(returnTo)}`;
}

/**
 * Absolute URL the backend will embed in the password-reset email. Derived from
 * the host actually serving the panel so the emailed link works in every
 * environment without a matching PUBLIC_APP_URL to keep in sync.
 */
export function resetPasswordUrl(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${RESET_PASSWORD_PATH}`;
}

/** The backend only accepts Ethiopian mobile numbers in these three forms. */
export function isEthiopianPhone(value: string): boolean {
  return /^(?:\+2519|2519|09)\d{8}$/.test(value.trim());
}
