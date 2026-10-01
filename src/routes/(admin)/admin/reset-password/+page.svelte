<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { FormField } from "$lib/components/ui/form-field/index.js";
  import Icon from "$lib/components/ui/Icon/index.js";
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import { getAnonymousClient } from "$graphql/client";
  import RESET_PASSWORD from "$graphql/mutation/auth/reset_password.gql";
  import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
  import type { PageProps } from "./$types";

  type ResetPasswordResponse = {
    reset_password: { message: string; status_code: number };
  };

  let { data }: PageProps = $props();

  // The emailed link carries the token in the query string. `load` re-runs on
  // navigation, so this must track `data` rather than snapshot it.
  let resetToken = $derived(data.resetToken);

  let password = $state("");
  let confirmPassword = $state("");
  let passwordError = $state("");
  let confirmError = $state("");
  let loading = $state(false);
  let done = $state(false);

  const minLength = 8;

  function validatePassword(value: string): boolean {
    if (!value) {
      passwordError = "Please enter a new password";
      return false;
    }
    if (value.length < minLength) {
      passwordError = `Password must be at least ${minLength} characters`;
      return false;
    }
    passwordError = "";
    return true;
  }

  function validateConfirm(value: string): boolean {
    if (value !== password) {
      confirmError = "Passwords do not match";
      return false;
    }
    confirmError = "";
    return true;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (loading) return;

    if (!resetToken) return;
    if (!validatePassword(password)) return;
    if (!validateConfirm(confirmPassword)) return;

    loading = true;

    try {
      const result = await getAnonymousClient().mutate<ResetPasswordResponse>({
        mutation: RESET_PASSWORD,
        variables: {
          newPassword: password,
          resetToken,
        },
      });

      const res = result.data?.reset_password;

      if (res && res.status_code >= 200 && res.status_code < 300) {
        done = true;
        toast.success(res.message || "Password updated");
        return;
      }

      toast.error(res?.message || "Something went wrong");
    } catch (err: unknown) {
      if (CombinedGraphQLErrors.is(err)) {
        toast.error(err.errors[0]?.message ?? "Something went wrong");
        return;
      }
      if (ServerError.is(err)) {
        toast.error(err.message || "Something went wrong");
        return;
      }
      toast.error(err instanceof Error && err.message ? err.message : "Something went wrong");
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Reset Password — BamanStock</title>
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
      {#if !resetToken}
        <div class="space-y-6 text-center">
          <div class="flex flex-col items-center gap-3 py-4">
            <div class="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <Icon iconName="icon/alert-circle" size={28} class="text-destructive" />
            </div>
            <h2 class="text-2xl font-bold text-foreground">Invalid reset link</h2>
            <p class="text-sm text-muted-foreground leading-relaxed">
              This password reset link is missing its token. Request a new link to continue.
            </p>
          </div>
          <Button
            type="button"
            class="w-full bg-info text-info-foreground rounded-full py-5 font-medium"
            onclick={() => goto("/admin/forgot-password", { replaceState: true })}
          >
            Request a new link
          </Button>
        </div>
      {:else if done}
        <div class="space-y-6">
          <div class="flex flex-col items-center gap-3 py-4">
            <div class="w-14 h-14 rounded-full bg-info/10 flex items-center justify-center">
              <Icon iconName="icon/check" size={28} class="text-info" />
            </div>
            <h2 class="text-xl font-bold text-foreground">Password updated</h2>
            <p class="text-sm text-muted-foreground text-center leading-relaxed">
              Your password has been changed. Sign in with your new password.
            </p>
          </div>
          <Button
            type="button"
            class="w-full bg-info text-info-foreground rounded-full py-5 font-medium"
            onclick={() => goto("/admin/login", { replaceState: true })}
          >
            Go to login
          </Button>
        </div>
      {:else}
        <div class="space-y-2 text-center">
          <h2 class="text-2xl font-bold text-foreground">Choose a new password</h2>
          <p class="text-sm text-muted-foreground">
            Pick something at least {minLength} characters long.
          </p>
        </div>

        <form class="space-y-6" onsubmit={handleSubmit} novalidate>
          <div class="space-y-2">
            <FormField
              id="password"
              label="New Password"
              type="password"
              placeholder="Enter a new password"
              bind:value={password}
              oninput={() => { if (passwordError) validatePassword(password); }}
              showPasswordToggle
              required
            />
            {#if passwordError}
              <p class="text-sm text-destructive">{passwordError}</p>
            {/if}
          </div>

          <div class="space-y-2">
            <FormField
              id="confirmPassword"
              label="Confirm New Password"
              type="password"
              placeholder="Re-enter your new password"
              bind:value={confirmPassword}
              oninput={() => { if (confirmError) validateConfirm(confirmPassword); }}
              showPasswordToggle
              required
            />
            {#if confirmError}
              <p class="text-sm text-destructive">{confirmError}</p>
            {/if}
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={loading}
            class="w-full bg-info text-info-foreground rounded-full py-6 text-lg font-medium"
          >
            {#if loading}
              <Icon iconName="icon/refresh-cw" size={18} class="animate-spin" />
              Updating...
            {:else}
              Update password
            {/if}
          </Button>
        </form>

        <div class="text-center text-sm text-muted-foreground">
          <a href="/admin/login" class="text-info font-medium">Back to login</a>
        </div>
      {/if}
    </div>
  </div>
</div>
