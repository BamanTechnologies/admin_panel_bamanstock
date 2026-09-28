<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { FormField } from "$lib/components/ui/form-field/index.js";
  import Icon from "$lib/components/ui/Icon/index.js";
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import { getAnonymousClient } from "$graphql/client";
  import { isEthiopianPhone, resetPasswordUrl } from "$lib/auth/guards.js";
  import FORGOT_PASSWORD from "$graphql/mutation/auth/forgot_password.gql";
  import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";

  type ForgotPasswordResponse = {
    forgot_password: { message: string; status_code: number };
  };

  let phone = $state("");
  let phoneError = $state("");
  let loading = $state(false);
  let sent = $state(false);

  function validatePhone(value: string): boolean {
    if (!value.trim()) {
      phoneError = "Please enter your phone number";
      return false;
    }
    if (!isEthiopianPhone(value)) {
      phoneError = "Enter a valid Ethiopian phone number (e.g. +251911234567)";
      return false;
    }
    phoneError = "";
    return true;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!validatePhone(phone) || loading) return;

    loading = true;
    sent = false;

    try {
      const result = await getAnonymousClient().mutate<ForgotPasswordResponse>({
        mutation: FORGOT_PASSWORD,
        variables: {
          phone: phone.trim(),
          redirectUrl: resetPasswordUrl(),
        },
      });

      const data = result.data?.forgot_password;

      if (data && data.status_code >= 200 && data.status_code < 300) {
        sent = true;
        toast.success(data.message || "Reset link sent");
        return;
      }

      // 404 is an unknown number. Surfacing the backend's own wording keeps the
      // response consistent with what the API actually reports.
      toast.error(data?.message || "Something went wrong");
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
  <title>Forgot Password — BamanStock</title>
</svelte:head>

<div class="min-h-screen bg-background flex items-center justify-center p-4">
  <div class="w-full max-w-md space-y-8">
    <div class="flex items-center justify-center gap-3">
      <div class="w-12 h-12 rounded-xl bg-info flex items-center justify-center">
        <Icon iconName="icon/trending-up" size={24} class="text-info-foreground" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-foreground">BamanStock</h1>
        <p class="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Admin Portal
        </p>
      </div>
    </div>

    <div class="bg-card border border-border rounded-2xl shadow-sm p-8 space-y-8">
      <div class="space-y-2 text-center">
        <h2 class="text-2xl font-bold text-foreground">Reset your password</h2>
        <p class="text-sm text-muted-foreground">
          Enter the phone number on your admin account and we'll email you a reset link.
        </p>
      </div>

      {#if sent}
        <div class="space-y-6">
          <div class="flex flex-col items-center gap-3 py-4">
            <div class="w-14 h-14 rounded-full bg-info/10 flex items-center justify-center">
              <Icon iconName="icon/check" size={28} class="text-info" />
            </div>
            <p class="text-sm text-muted-foreground text-center leading-relaxed">
              If an admin account exists for
              <span class="font-bold text-foreground">{phone.trim()}</span>,
              a reset link is on its way. Check your inbox.
            </p>
          </div>
          <Button
            type="button"
            class="w-full bg-info text-info-foreground rounded-full py-5 font-medium"
            onclick={() => goto("/admin/login", { replaceState: true })}
          >
            Back to login
          </Button>
        </div>
      {:else}
        <form class="space-y-6" onsubmit={handleSubmit} novalidate>
          <div class="space-y-2">
            <FormField
              id="phone"
              label="Phone Number"
              type="tel"
              placeholder="+251911234567"
              bind:value={phone}
              oninput={() => { if (phoneError) validatePhone(phone); }}
              required
            />
            {#if phoneError}
              <p class="text-sm text-destructive">{phoneError}</p>
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
              Sending...
            {:else}
              Send reset link
            {/if}
          </Button>
        </form>

        <div class="text-center text-sm text-muted-foreground">
          Remembered it?
          <a href="/admin/login" class="text-info font-medium ml-1">Back to login</a>
        </div>
      {/if}
    </div>
  </div>
</div>
