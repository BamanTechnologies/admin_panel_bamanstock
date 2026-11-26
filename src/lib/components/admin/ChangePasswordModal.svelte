<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { getAdminClient } from "$graphql/client";
  import CHANGE_PASSWORD from "$graphql/mutation/users/change_password.gql";
  import { toast } from "svelte-sonner";
  import { fade, scale } from "svelte/transition";
  import { onDestroy } from "svelte";
  import { copyText } from "$lib/share/index.js";
  import {
    generatePassword,
    isPasswordValid,
    passwordRuleStates,
  } from "$lib/password.js";

  let {
    isOpen = $bindable(false),
    userId = "",
    userLabel = "this user",
    onClose = () => {},
    onSuccess = () => {},
  } = $props();

  let password = $state("");
  let confirmPassword = $state("");
  let loading = $state(false);
  let error = $state<string | null>(null);
  let showPassword = $state(false);
  let copied = $state(false);
  let copiedTimeout: ReturnType<typeof setTimeout> | undefined;

  const rules = $derived(passwordRuleStates(password));
  const passwordsMatch = $derived(confirmPassword.length > 0 && password === confirmPassword);

  onDestroy(() => {
    if (copiedTimeout) clearTimeout(copiedTimeout);
  });

  function resetForm() {
    password = "";
    confirmPassword = "";
    error = null;
    showPassword = false;
    copied = false;
    if (copiedTimeout) {
      clearTimeout(copiedTimeout);
      copiedTimeout = undefined;
    }
  }

  function handleClose() {
    if (loading) return;
    isOpen = false;
    resetForm();
    onClose();
  }

  async function handleGenerate() {
    const generated = generatePassword();
    password = generated;
    confirmPassword = generated;
    error = null;

    let didCopy = true;
    try {
      await copyText(generated);
    } catch {
      didCopy = false;
      error = "The password was generated but could not be copied. Copy it manually.";
    }

    if (!didCopy) return;
    copied = true;
    if (copiedTimeout) clearTimeout(copiedTimeout);
    copiedTimeout = setTimeout(() => {
      copied = false;
      copiedTimeout = undefined;
    }, 2000);
  }

  function validate(): string | null {
    if (!isPasswordValid(password)) {
      return "The password must be at least 8 characters long, include uppercase and lowercase letters, and include at least one number.";
    }
    if (!confirmPassword) return "Please confirm the password.";
    if (password !== confirmPassword) return "The confirmation does not match the password.";
    return null;
  }

  async function handleSubmit() {
    if (loading) return;
    error = validate();
    if (error) return;

    loading = true;
    try {
      const result = await getAdminClient().mutate<{
        admin_update_password: { message: string; status_code: number };
      }>({
        mutation: CHANGE_PASSWORD,
        variables: { userId, password },
      });

      const response = result.data?.admin_update_password;
      if (response?.status_code !== 200) {
        throw new Error(response?.message || "The password could not be changed.");
      }

      toast.success(`Password changed for ${userLabel}`);
      isOpen = false;
      resetForm();
      onSuccess();
    } catch (e) {
      error = e instanceof Error ? e.message : "The password could not be changed.";
    } finally {
      loading = false;
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
    transition:fade
    role="dialog"
    aria-modal="true"
    aria-labelledby="change-password-title"
  >
    <div
      class="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92vh] overflow-y-auto"
      transition:scale={{ start: 0.95 }}
    >
      <div class="p-6 flex justify-between items-center border-b border-border">
        <div>
          <h3 id="change-password-title" class="text-xl font-bold text-foreground">Change password</h3>
          <p class="text-sm text-muted-foreground mt-0.5 truncate max-w-[280px]">{userLabel}</p>
        </div>
        <button
          type="button"
          onclick={handleClose}
          disabled={loading}
          class="p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30"
          aria-label="Close modal"
        >
          <Icon iconName="icon/x" size={20} />
        </button>
      </div>

      <form
        novalidate
        class="p-6 flex flex-col gap-4"
        onsubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {#if error}
          <div class="p-3 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-2 text-left">
            <Icon iconName="icon/alert-circle" size={16} class="text-destructive shrink-0 mt-0.5" />
            <p class="text-sm text-destructive break-words">{error}</p>
          </div>
        {/if}

        <div class="flex flex-col gap-1.5">
          <label for="new-password" class="text-sm font-medium text-foreground">
            New password <span class="text-destructive">*</span>
          </label>
          <div class="relative">
            <Input
              id="new-password"
              type={showPassword ? "text" : "password"}
              bind:value={password}
              placeholder="Enter or generate a password"
              autocomplete="new-password"
              class="pr-32"
            />
            <div class="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
              {#if copied}
                <span class="text-[11px] font-semibold text-emerald-600">Copied</span>
              {/if}
              <button
                type="button"
                onclick={() => (showPassword = !showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
                class="p-1 rounded-md text-muted-foreground hover:text-info transition-colors"
              >
                <Icon iconName={showPassword ? "icon/eye-off" : "icon/eye"} size={16} />
              </button>
              <button
                type="button"
                onclick={handleGenerate}
                title="Generate password"
                aria-label="Generate password"
                class="p-1 rounded-md text-muted-foreground hover:text-info transition-colors"
              >
                <Icon
                  iconName={copied ? "icon/check" : "icon/refresh-cw"}
                  size={16}
                  class={copied ? "text-emerald-600" : ""}
                />
              </button>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="confirm-password" class="text-sm font-medium text-foreground">
            Confirm password <span class="text-destructive">*</span>
          </label>
          <Input
            id="confirm-password"
            type="password"
            bind:value={confirmPassword}
            placeholder="Re-enter the password"
            autocomplete="new-password"
          />
          <p
            class="text-xs {confirmPassword.length === 0
              ? 'text-muted-foreground'
              : passwordsMatch
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-destructive'}"
          >
            {confirmPassword.length === 0
              ? "Confirm the password by typing it again."
              : passwordsMatch
                ? "Passwords match."
                : "Passwords do not match."}
          </p>
        </div>

        <div class="rounded-lg border border-border bg-muted/40 p-3.5 text-left">
          <p class="text-xs font-bold uppercase tracking-wide text-foreground">
            Password Requirements:
          </p>
          <ul class="mt-2 space-y-1.5">
            {#each rules as rule (rule.label)}
              <li
                class="flex items-center gap-2 text-xs {rule.met
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground'}"
              >
                <Icon iconName={rule.met ? "icon/check-circle" : "icon/info"} size={14} />
                {rule.label}
              </li>
            {/each}
          </ul>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onclick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {#if loading}
              <Icon iconName="icon/refresh-cw" size={16} class="animate-spin" />
              Saving…
            {:else}
              <Icon iconName="icon/key-round" size={16} />
              Change password
            {/if}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}
