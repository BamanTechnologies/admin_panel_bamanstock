import type { PageLoad } from './$types';

/** The emailed link may carry the token as `token`, `reset_token` or `t`. */
function extractToken(url: URL): string {
  for (const key of ['token', 'reset_token', 't']) {
    const value = url.searchParams.get(key);
    if (value) return value;
  }
  // Tolerate a path-style link such as /admin/reset-password/<token>.
  const segments = url.pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (segments.length > 3 && last && last !== 'reset-password') return last;
  return '';
}

export const load: PageLoad = ({ url }) => {
  return {
    resetToken: extractToken(url),
  };
};
