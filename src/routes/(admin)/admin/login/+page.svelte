<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { FormField } from "$lib/components/ui/form-field/index.js";
  import Icon from "$lib/components/ui/Icon/index.js";
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import { getAnonymousClient } from "$graphql/client";
  import {
    ADMIN_ROLE,
    authStore,
    decodeToken,
    hasAdminRole,
  } from "$lib/stores/auth.svelte.js";
  import LOGIN from "$graphql/queries/auth/login.gql";
  import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  type LoginResponse = {
    user_login: {
      token: string;
      status_code: number;
      message?: string;
    };
  };

  let credential = $state("");
  let password = $state("");
  let credentialError = $state("");
  let loading = $state(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[0-9]{7,15}$/;

  function isEmail(value: string): boolean {
    return emailRegex.test(value);
  }

  function validateCredential(value: string): boolean {
    if (!value.trim()) {
      credentialError = "Please enter an email or phone number";
      return false;
    }
    if (isEmail(value) || phoneRegex.test(value)) {
      credentialError = "";
      return true;
    }
    credentialError = "Invalid email or phone number format";
    return false;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!validateCredential(credential)) return;
    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    loading = true;

    try {
      const variables: { email?: string; phone?: string; password: string } = {
        password,
      };
      if (isEmail(credential)) {
        variables.email = credential;
      } else {
        variables.phone = credential;
      }

      const result = await getAnonymousClient().mutate<LoginResponse>({
        mutation: LOGIN,
        variables,
      });

      const login = result.data?.user_login;

      if (login?.token && login.status_code === 200) {
        const payload = decodeToken(login.token);

        if (!payload) {
          toast.error("Received an unreadable session token");
          return;
        }

        if (!hasAdminRole(payload)) {
          toast.error("You do not have admin permissions");
          return;
        }

        if (authStore.loginWithToken(login.token) === null) {
          toast.error("Session token was rejected");
          return;
        }

        toast.success("Login successful");
        await goto(data.redirectTo, { replaceState: true });
        return;
      }

      toast.error(login?.message || "Something went wrong");
    } catch (err: unknown) {
      if (CombinedGraphQLErrors.is(err)) {
        toast.error(err.errors[0]?.message ?? "Something went wrong");
        return;
      }

      if (ServerError.is(err)) {
        if (err.statusCode === 401 || err.statusCode === 403) {
          toast.error("Invalid credentials");
        } else {
          toast.error(err.message || "Something went wrong");
        }
        return;
      }

      toast.error(err instanceof Error && err.message ? err.message : "Something went wrong");
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Admin Login — BamanStock</title>
</svelte:head>

<div class="min-h-screen bg-background flex items-center justify-center p-4">
  <div class="w-full max-w-md space-y-8">
    <div class="flex items-center justify-center gap-3">
      <div class="w-12 h-12 rounded-xl bg-info flex items-center justify-center">
        <Icon iconName="icon/trending-up" size={24} class="text-info-foreground" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-foreground">BamanStock</h1>
        <p class="text-xs font-medium capitalize text-muted-foreground">
          Admin Portal
        </p>
      </div>
    </div>

    <div class="bg-card border border-border rounded-2xl shadow-sm p-8 space-y-8">
      <div class="space-y-2 text-center">
        <h2 class="text-2xl font-bold text-foreground">Sign in to continue</h2>
        <p class="text-sm text-muted-foreground">
          Admin credentials are required to access this portal.
        </p>
      </div>

      <form class="space-y-6" onsubmit={handleSubmit} novalidate>
        <div class="space-y-2">
          <FormField
            id="credential"
            label="Email or Phone Number"
            type="text"
            placeholder="admin@bamanstock.com"
            bind:value={credential}
            oninput={() => { if (credentialError) validateCredential(credential); }}
            required
          />
          {#if credentialError}
            <p class="text-sm text-destructive">{credentialError}</p>
          {/if}
        </div>

        <div class="space-y-2">
          <FormField
            id="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            bind:value={password}
            showPasswordToggle
            required
          />
          <div class="flex justify-end">
            <a
              href="/admin/forgot-password"
              class="text-sm text-info font-medium hover:underline"
            >
              Forgot Password?
            </a>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          class="w-full bg-info text-info-foreground rounded-full py-6 text-lg font-medium"
        >
          {#if loading}
            <Icon iconName="icon/refresh-cw" size={18} class="animate-spin" />
            Logging in...
          {:else}
            Login
          {/if}
        </Button>
      </form>

      <p class="text-xs text-muted-foreground text-center leading-relaxed">
        Access is restricted to accounts holding the
        <span class="font-mono font-bold text-foreground">{ADMIN_ROLE}</span>
        role.
      </p>
    </div>
  </div>
</div>
