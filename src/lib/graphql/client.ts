import { ApolloClient, InMemoryCache, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { HttpLink } from '@apollo/client/link/http';
import { onError } from '@apollo/client/link/error';
import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { PUBLIC_HASURA_URL } from '$env/static/public';
import { ADMIN_ROLE, authStore } from '$lib/stores/auth.svelte.js';
import { LOGIN_PATH } from '$lib/auth/guards.js';

const HASURA_URL = browser ? PUBLIC_HASURA_URL || 'http://localhost:8080/v1/graphql' : '';

function errorLink() {
  return onError(({ error }) => {
    if (CombinedGraphQLErrors.is(error)) {
      for (const err of error.errors) {
        console.error(`[GraphQL]: ${err.message}`);
      }
    } else if (ServerError.is(error)) {
      console.error(`[Network ${error.statusCode}]: ${error.message}`);
    } else {
      console.error(`[Error]: ${error.message}`);
    }
  });
}

function authErrorLink() {
  return onError(({ error }) => {
    if (CombinedGraphQLErrors.is(error)) {
      // Only a rejected JWT ends the session. `access-denied` / `invalid-arg`
      // mean the token is fine but the operation is not permitted, so logging
      // out there would eject a legitimate admin over one unpermissioned field.
      const isJwtRejected = error.errors?.some(
        (err) => err.extensions?.code === 'invalid-jwt'
      );

      if (isJwtRejected) {
        authStore.logout();
        resetClients();
        if (browser) {
          goto(LOGIN_PATH);
        }
        return;
      }

      for (const err of error.errors) {
        console.error(`[GraphQL]: ${err.message}`);
      }
    } else if (ServerError.is(error)) {
      console.error(`[Network ${error.statusCode}]: ${error.message}`);
    } else {
      console.error(`[Error]: ${error.message}`);
    }
  });
}

function anonymousLink() {
  const http = new HttpLink({ uri: HASURA_URL });
  return from([errorLink(), http]);
}

function authLink(role?: string) {
  const http = new HttpLink({ uri: HASURA_URL });
  const auth = setContext(() => {
    // Read on every request so a rotated token is picked up without rebuilding the client.
    const token = authStore.getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (role) headers['x-hasura-role'] = role;
    return { headers };
  });
  return from([authErrorLink(), auth, http]);
}

const defaultOptions = {
  watchQuery: { fetchPolicy: 'network-only' as const },
  query: { fetchPolicy: 'network-only' as const },
  mutate: { fetchPolicy: 'network-only' as const },
};

let anonymousClient: ApolloClient | null = null;
const roleClients = new Map<string, ApolloClient>();

export function getAnonymousClient(): ApolloClient {
  if (!anonymousClient) {
    anonymousClient = new ApolloClient({
      link: anonymousLink(),
      cache: new InMemoryCache(),
      defaultOptions,
    });
  }
  return anonymousClient;
}

export function getAuthClient(role: string = ADMIN_ROLE): ApolloClient {
  const cached = roleClients.get(role);
  if (cached) return cached;

  const client = new ApolloClient({
    link: authLink(role),
    cache: new InMemoryCache(),
    defaultOptions,
  });
  roleClients.set(role, client);
  return client;
}

/**
 * Authenticated client for admin pages. Throws when there is no usable token so a
 * protected query can never silently execute against Hasura without credentials.
 */
export function getAdminClient(): ApolloClient {
  const token = authStore.getToken();
  if (!token) {
    throw new Error('getAdminClient() called without an admin token');
  }
  return getAuthClient(ADMIN_ROLE);
}

export function getClient(): ApolloClient {
  return authStore.isAuthenticated ? getAdminClient() : getAnonymousClient();
}

export function resetClients() {
  anonymousClient = null;
  roleClients.clear();
}

authStore.onLogout(resetClients);
authStore.onLogin(resetClients);
