<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";
  import { FormField } from "$lib/components/ui/form-field/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { fade, scale } from "svelte/transition";
  import { toast } from "svelte-sonner";
  import { getAdminClient } from "$graphql/client";
  import CHANGE_PASSWORD from "$graphql/mutation/auth/change_password.gql";
  import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";

  type ChangePasswordResponse = {
    change_password: { message: string; status_code: number };
  };

  let { isOpen = $bindable(), onClose = () => {} } = $props();

  let currentPassword = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");
  let currentError = $state("");
  let newError = $state("");
  let confirmError = $state("");
  let loading = $state(false);

  const minLength = 8;

  function clear() {
    currentPassword = "";
    newPassword = "";
    confirmPassword = "";
    currentError = "";
    newError = "";
    confirmError = "";
  }

  function close() {
    isOpen = false;
    clear();
    onClose();
  }

  function validateCurrent(): boolean {
    if (!currentPassword) {
      currentError = "Please enter your current password";
      return false;
    }
    currentError = "";
    return true;
  }

  function validateNew(): boolean {
    if (!newPassword) {
      newError = "Please enter a new password";
      return false;
    }
    if (newPassword.length < minLength) {
      newError = `Password must be at least ${minLength} characters`;
      return false;
    }
    newError = "";
    return true;
  }

  function validateConfirm(): boolean {
    if (confirmPassword !== newPassword) {
      confirmError = "Passwords do not match";
      return false;
    }
    confirmError = "";
    return true;
  }

  async function handleSubmit() {
    if (loading) return;
    if (!validateCurrent() || !validateNew() || !validateConfirm()) return;

    loading = true;
    try {
      const result = await getAdminClient().mutate<ChangePasswordResponse>({
        mutation: CHANGE_PASSWORD,
        variables: {
          oldPassword: currentPassword,
          newPassword,
        },
      });

      const res = result.data?.change_password;

      if (res && res.status_code >= 200 && res.status_code < 300) {
        toast.success(res.message || "Password updated");
        close();
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
      if (err instanceof Error && /without an admin token/.test(err.message)) {
        toast.error("Your session has expired. Please sign in again.");
        return;
      }
      toast.error(err instanceof Error && err.message ? err.message : "Something went wrong");
    } finally {
      loading = false;
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
    transition:fade
  >
    <div
      class="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      transition:scale={{ start: 0.95 }}
    >
      <div class="p-6 flex justify-between items-center border-b border-border">
        <h3 class="text-xl font-bold text-foreground">Change Password</h3>
        <button
          type="button"
          onclick={close}
          class="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <Icon iconName="icon/x" size={20} />
        </button>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} novalidate class="p-8 space-y-6">
        <div class="space-y-2">
          <FormField
            id="currentPassword"
            label="Current Password"
            type="password"
            placeholder="Enter your current password"
            bind:value={currentPassword}
            showPasswordToggle
            required
          />
          {#if currentError}
            <p class="text-sm text-destructive">{currentError}</p>
          {/if}
        </div>

        <div class="space-y-2">
          <FormField
            id="newPassword"
            label="New Password"
            type="password"
            placeholder={`At least ${minLength} characters`}
            bind:value={newPassword}
            showPasswordToggle
            required
          />
          {#if newError}
            <p class="text-sm text-destructive">{newError}</p>
          {/if}
        </div>

        <div class="space-y-2">
          <FormField
            id="confirmPassword"
            label="Confirm New Password"
            type="password"
            placeholder="Re-enter your new password"
            bind:value={confirmPassword}
            showPasswordToggle
            required
          />
          {#if confirmError}
            <p class="text-sm text-destructive">{confirmError}</p>
          {/if}
        </div>

        <div class="pt-2 flex justify-end gap-3">
          <Button type="button" variant="outline" onclick={close}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {#if loading}
              <Icon iconName="icon/refresh-cw" size={16} class="animate-spin" />
              Updating...
            {:else}
              Change Password
            {/if}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}