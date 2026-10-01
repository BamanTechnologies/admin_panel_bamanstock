import { safeRedirectTarget } from '$lib/auth/guards.js';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
  return { redirectTo: safeRedirectTarget(url.searchParams.get('redirect')) };
};
