<script lang="ts">
  import "../app.css";
  import { Toaster, toast } from "svelte-sonner";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";
  import { authStore, validateSession, type SessionRejection } from "$lib/stores/auth.svelte.js";
  import {
    isPublicPath,
    loginUrlFor,
    safeRedirectTarget,
  } from "$lib/auth/guards.js";

  let { children } = $props();

  // Gates rendering so an unauthorized page never paints, even for the single
  // frame it takes goto() to resolve. Seeded from the real URL rather than the
  // derived value, which would otherwise be read before the first update.
  let authorized = $state(browser ? isPublicPath(window.location.pathname) : false);

  function rejectionMessage(reason: SessionRejection): string {
    switch (reason) {
      case 'expired':
        return "Your session has expired. Please sign in again.";
      case 'forbidden':
        return "You do not have admin permissions.";
      case 'invalid':
        return "Your session is invalid. Please sign in again.";
      default:
        return "Please sign in to continue.";
    }
  }

  $effect(() => {
    // Read the url inside the effect so *every* navigation re-validates.
    // Depending only on the isPublicRoute boolean would skip re-validation when
    // moving between two protected pages, since it stays false either way.
    const pathname = $page.url.pathname;
    const search = $page.url.search;
    const publicRoute = isPublicPath(pathname);

    // Validate before hydrating: init() drops an unusable token, which would
    // erase the expired/forbidden distinction this message depends on.
    const check = validateSession();

    if (publicRoute) {
      // A live session has no business sitting on the login screen.
      if (check.ok) {
        authStore.init();
        authorized = true;
        goto(safeRedirectTarget($page.url.searchParams.get("redirect")), { replaceState: true });
        return;
      }
      authorized = true;
      if (check.reason !== 'missing') {
        authStore.logout();
      }
      return;
    }

    if (check.ok) {
      authStore.init();
      authorized = true;
      return;
    }

    authorized = false;
    authStore.logout();
    toast.error(rejectionMessage(check.reason));
    goto(loginUrlFor(pathname, search), { replaceState: true });
  });
</script>

{#if authorized}
  {@render children()}
{/if}
<Toaster richColors closeButton />
