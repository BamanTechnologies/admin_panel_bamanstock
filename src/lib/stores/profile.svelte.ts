import { jwtDecode } from 'jwt-decode';
import { getAdminClient } from '$graphql/client';
import { authStore } from '$lib/stores/auth.svelte.js';
import ADMIN_PROFILE_QUERY from '$graphql/queries/auth/profile.gql';

export type AdminProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  profile_picture: string | null;
};

export type AdminProfileResult = {
  data: AdminProfile | null;
  loading: boolean;
  error: string | null;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  initials: string;
  refetch: () => Promise<void>;
};

export function useAdminProfile(): AdminProfileResult {
  let data = $state<AdminProfile | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  async function fetchProfile() {
    const token = authStore.getToken();
    if (!token || !authStore.isAuthenticated) {
      data = null;
      loading = false;
      return;
    }

    const userId = (() => {
      try {
        const payload = jwtDecode<{ metadata?: Record<string, string> }>(token);
        return payload.metadata?.['x-hasura-user-id'] ?? null;
      } catch {
        return null;
      }
    })();

    if (!userId) {
      data = null;
      loading = false;
      return;
    }

    loading = true;
    error = null;

    try {
      const result = await getAdminClient().query<{ profile: AdminProfile }>({
        query: ADMIN_PROFILE_QUERY,
        variables: { id: userId },
        fetchPolicy: 'network-only',
      });
      data = result.data?.profile ?? null;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load profile';
      data = null;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    fetchProfile();
  });

  return {
    get data() { return data; },
    get loading() { return loading; },
    get error() { return error; },
    get name() {
      if (!data) return authStore.user?.name ?? '';
      return `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim();
    },
    get email() { return data?.email ?? authStore.user?.email ?? ''; },
    get phone() { return data?.phone ?? authStore.user?.phone ?? ''; },
    get avatar() { return data?.profile_picture ?? authStore.user?.avatar ?? ''; },
    get initials() {
      const source = this.name.trim();
      if (!source) return 'A';
      return source
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
    },
    refetch: fetchProfile,
  };
}
