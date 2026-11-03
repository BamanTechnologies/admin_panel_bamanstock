<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import Icon from "$lib/components/ui/Icon/index.js";
  import { getAdminClient } from "$graphql/client";
  import { isEthiopianPhone } from "$lib/auth/guards.js";
  import INSERT_CUSTOMER from "$graphql/mutation/customers/insrt.gql";
  import UPDATE_CUSTOMER from "$graphql/mutation/customers/update.gql";

  type CustomerRow = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
    address: string | null;
  };

  let {
    isOpen = $bindable(false),
    customer = null as CustomerRow | null,
    onSuccess = () => {},
    onClose = () => {},
  } = $props();

  let firstName = $state("");
  let lastName = $state("");
  let phone = $state("");
  let address = $state("");
  let loading = $state(false);
  let error = $state<string | null>(null);
  let isEditing = $derived(!!customer);

  $effect(() => {
    if (isOpen) {
      error = null;
      firstName = customer?.first_name ?? "";
      lastName = customer?.last_name ?? "";
      phone = customer?.phone_number ?? "";
      address = customer?.address ?? "";
    }
  });

  function handleClose() {
    if (loading) return;
    isOpen = false;
    firstName = "";
    lastName = "";
    phone = "";
    address = "";
    error = null;
    onClose();
  }

  async function handleSubmit() {
    if (loading) return;
    if (!firstName.trim()) {
      error = "First name is required.";
      return;
    }
    if (!lastName.trim()) {
      error = "Last name is required.";
      return;
    }
    if (!phone.trim()) {
      error = "Phone number is required.";
      return;
    }
    if (!isEthiopianPhone(phone)) {
      error = "Phone number must be a valid Ethiopian mobile (e.g. +251911234567, 251911234567 or 0911234567).";
      return;
    }
    if (!address.trim()) {
      error = "Address is required.";
      return;
    }
    error = null;
    loading = true;
    try {
      const client = getAdminClient();
      const scalar = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim(),
        address: address.trim(),
      };
      if (customer) {
        await client.mutate({
          mutation: UPDATE_CUSTOMER,
          variables: { id: customer.id, object: scalar },
        });
      } else {
        await client.mutate({
          mutation: INSERT_CUSTOMER,
          variables: { object: scalar },
        });
      }
      isOpen = false;
      firstName = "";
      lastName = "";
      phone = "";
      address = "";
      onSuccess();
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to save customer.";
    } finally {
      loading = false;
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    onclick={loading ? undefined : handleClose}
    role="dialog"
    aria-modal="true"
    aria-labelledby="customer-form-title"
  >
    <div
      class="bg-card rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="flex items-center justify-between p-6 border-b border-border">
        <h2 id="customer-form-title" class="text-xl font-bold text-foreground">
          {isEditing ? "Edit Customer" : "Add Customer"}
        </h2>
        <button
          type="button"
          class="p-1 rounded-md hover:bg-muted transition-colors disabled:opacity-30"
          onclick={handleClose}
          disabled={loading}
          aria-label="Close modal"
        >
          <Icon iconName="icon/x" size={20} class="text-foreground" />
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

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label for="customer-first-name" class="text-sm font-medium text-foreground">
              First name <span class="text-destructive">*</span>
            </label>
            <input
              id="customer-first-name"
              type="text"
              bind:value={firstName}
              placeholder="First name"
              class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="customer-last-name" class="text-sm font-medium text-foreground">
              Last name <span class="text-destructive">*</span>
            </label>
            <input
              id="customer-last-name"
              type="text"
              bind:value={lastName}
              placeholder="Last name"
              class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="customer-phone" class="text-sm font-medium text-foreground">
            Phone number <span class="text-destructive">*</span>
          </label>
          <input
            id="customer-phone"
            type="tel"
            bind:value={phone}
            placeholder="+251911234567"
            class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="customer-address" class="text-sm font-medium text-foreground">
            Address <span class="text-destructive">*</span>
          </label>
          <textarea
            id="customer-address"
            rows="3"
            bind:value={address}
            placeholder="Customer address"
            class="px-3 py-2 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border resize-none"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Button
            variant="outline"
            type="button"
            onclick={handleClose}
            disabled={loading}
            class="border-border text-foreground hover:bg-muted"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {#if loading}
              <Icon iconName="icon/refresh-cw" size={16} class="animate-spin" />
            {/if}
            {isEditing ? "Save Changes" : "Add Customer"}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}