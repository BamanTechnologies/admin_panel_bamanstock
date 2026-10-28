<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import Icon from "$lib/components/ui/Icon/index.js";
  import SearchSelect from "$lib/components/admin/search-select/SearchSelect.svelte";
  import RoleMultiSelect from "$lib/components/admin/role-select/RoleMultiSelect.svelte";
  import { getAdminClient } from "$graphql/client";
  import {
    PUBLIC_ADMIN_APP_URL,
    PUBLIC_INVESTOR_APP_URL,
    PUBLIC_MERCHANT_APP_URL,
  } from "$env/static/public";
  import INVESTOR_SEARCH from "$graphql/queries/investors/searchSelect.gql";
  import MERCHANT_SEARCH from "$graphql/queries/merchants/searchSelect.gql";
  import BRANCH_SEARCH from "$graphql/queries/branches/searchSelect.gql";
  import REGISTER_USER from "$graphql/mutation/users/register.gql";

  type SelectItem = Record<string, any>;
  type AccountType = "admin" | "investor" | "merchant";

  const APP_REDIRECT: Record<AccountType, string> = {
    admin: PUBLIC_ADMIN_APP_URL,
    investor: PUBLIC_INVESTOR_APP_URL,
    merchant: PUBLIC_MERCHANT_APP_URL,
  };
  const TYPE_ROLES: Record<AccountType, string[]> = {
    admin: ["super:admin"],
    investor: ["investor"],
    merchant: ["merchant"],
  };
  const ACCOUNT_TYPES: AccountType[] = ["admin", "investor", "merchant"];

  let {
    isOpen = $bindable(false),
    onClose = () => {},
    onSuccess = () => {},
  } = $props();

  let accountType = $state<AccountType>("investor");
  let selectedPersonId = $state<string | null>(null);
  let firstName = $state("");
  let lastName = $state("");
  let phone = $state("");
  let email = $state("");
  let password = $state("");
  let address = $state("");
  let branchId = $state<string | null>(null);
  let roles = $state<string[]>([]);
  let isActive = $state(true);
  let isInvitation = $state(false);
  let loading = $state(false);
  let error = $state<string | null>(null);

  const accountTypeLabel = $derived(accountType[0].toUpperCase() + accountType.slice(1));
  const showPersonSelector = $derived(accountType !== "admin");
  const showBranchSelector = $derived(accountType === "merchant");
  const lockedRoles = $derived(["user", ...TYPE_ROLES[accountType]]);

  function syncRolesForType(type: AccountType) {
    roles = [...new Set([...lockedRolesFor(type)])];
  }

  function lockedRolesFor(type: AccountType): string[] {
    return ["user", ...TYPE_ROLES[type]];
  }

  function resetForm() {
    accountType = "investor";
    selectedPersonId = null;
    firstName = "";
    lastName = "";
    phone = "";
    email = "";
    password = "";
    address = "";
    branchId = null;
    roles = [];
    isActive = true;
    isInvitation = false;
    error = null;
    syncRolesForType("investor");
  }

  function handleClose() {
    if (loading) return;
    isOpen = false;
    resetForm();
    onClose();
  }

  function setAccountType(type: AccountType) {
    if (accountType === type) return;
    accountType = type;
    selectedPersonId = null;
    firstName = "";
    lastName = "";
    phone = "";
    branchId = null;
    syncRolesForType(type);
  }

  function personFilter(search: string) {
    const match = {
      _or: [
        { first_name: { _ilike: `%${search}%` } },
        { last_name: { _ilike: `%${search}%` } },
        { phone_number: { _ilike: `%${search}%` } },
      ],
    };
    if (accountType === "merchant") {
      return { _and: [match, { user_id: { _is_null: true } }] };
    }
    return match;
  }

  function personLabel(item: SelectItem) {
    return `${item.first_name ?? ""} ${item.last_name ?? ""}${
      item.phone_number ? ` · ${item.phone_number}` : ""
    }`.trim();
  }

  function handleSelectPerson(item: SelectItem | null) {
    if (!item) return;
    selectedPersonId = item.id ?? null;
    firstName = item.first_name ?? "";
    lastName = item.last_name ?? "";
    phone = item.phone_number ?? "";
  }

  function branchFilter(search: string) {
    return {
      _or: [
        { name: { _ilike: `%${search}%` } },
        { address: { _ilike: `%${search}%` } },
      ],
    };
  }

  function branchLabel(item: SelectItem) {
    return `${item.name ?? ""}${item.address ? ` · ${item.address}` : ""}`.trim();
  }

  function handleSelectBranch(item: SelectItem | null) {
    branchId = item?.id ?? null;
  }

  function validate(): string | null {
    if (!firstName.trim() || !phone.trim()) {
      return "First name and phone are required.";
    }
    if (accountType === "investor" || accountType === "merchant") {
      if (!lastName.trim() || !address.trim()) {
        return "Last name and address are required for this account type.";
      }
    }
    if (accountType === "merchant" && !branchId) {
      return "Select a branch for the merchant.";
    }
    if (!isInvitation && password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (isInvitation && !APP_REDIRECT[accountType].trim()) {
      return `Redirect URL is not configured for ${accountType} accounts.`;
    }
    return null;
  }

  async function handleSubmit() {
    if (loading) return;
    error = validate();
    if (error) return;

    loading = true;
    try {
      const client = getAdminClient();
      await client.mutate({
        mutation: REGISTER_USER,
        variables: {
          address: address.trim() || null,
          email: email.trim() || null,
          firstName: firstName.trim(),
          investorId: accountType === "investor" ? selectedPersonId : null,
          branchId: accountType === "merchant" ? branchId : null,
          isActive,
          isInvestor: accountType === "investor",
          isMerchant: accountType === "merchant",
          isInvitation,
          lastName: lastName.trim() || null,
          password: isInvitation ? null : password || null,
          phone: phone.trim(),
          profilePicture: null,
          redirectUrl: isInvitation ? APP_REDIRECT[accountType].trim() : null,
          roles: roles.filter((r) => r !== "user"),
        },
      });
      isOpen = false;
      resetForm();
      onSuccess();
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to register user.";
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
    aria-labelledby="register-user-title"
  >
    <div
      class="bg-card rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="flex items-center justify-between p-6 border-b border-border">
        <h2 id="register-user-title" class="text-xl font-bold text-foreground">
          Register User
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

        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-foreground">Account type:</span>
          <div class="inline-flex rounded-md border border-input bg-background p-0.5">
            {#each ACCOUNT_TYPES as type}
              <button
                type="button"
                onclick={() => setAccountType(type)}
                class={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  accountType === type
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type[0].toUpperCase() + type.slice(1)}
              </button>
            {/each}
          </div>
        </div>

        {#if showPersonSelector}
          <div class="flex flex-col gap-1.5">
            <span class="text-sm font-medium text-foreground">
              Link {accountType} (optional)
            </span>
            <SearchSelect
              query={accountType === "investor" ? INVESTOR_SEARCH : MERCHANT_SEARCH}
              dataKey={accountType}
              filterBuilder={personFilter}
              displayLabel={personLabel}
              valueKey="id"
              placeholder={`Search ${accountType} by name or phone...`}
              mode="form"
              onSelect={handleSelectPerson}
            />
          </div>
        {/if}

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label for="reg-first-name" class="text-sm font-medium text-foreground">
              First name <span class="text-destructive">*</span>
            </label>
            <input
              id="reg-first-name"
              type="text"
              bind:value={firstName}
              placeholder="First name"
              class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="reg-last-name" class="text-sm font-medium text-foreground">
              Last name
              {#if accountType !== "admin"}<span class="text-destructive">*</span>{/if}
            </label>
            <input
              id="reg-last-name"
              type="text"
              bind:value={lastName}
              placeholder="Last name"
              class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label for="reg-phone" class="text-sm font-medium text-foreground">
              Phone <span class="text-destructive">*</span>
            </label>
            <input
              id="reg-phone"
              type="tel"
              bind:value={phone}
              placeholder="+2519... or 09..."
              class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="reg-address" class="text-sm font-medium text-foreground">
              Address
              {#if accountType !== "admin"}<span class="text-destructive">*</span>{/if}
            </label>
            <input
              id="reg-address"
              type="text"
              bind:value={address}
              placeholder="Address"
              class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="reg-email" class="text-sm font-medium text-foreground">
            Email <span class="text-muted-foreground font-normal text-xs">(optional)</span>
          </label>
          <input
            id="reg-email"
            type="email"
            bind:value={email}
            placeholder="user@example.com"
            class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
          />
        </div>

        {#if showBranchSelector}
          <div class="flex flex-col gap-1.5">
            <span class="text-sm font-medium text-foreground">
              Branch <span class="text-destructive">*</span>
            </span>
            <SearchSelect
              query={BRANCH_SEARCH}
              dataKey="branches"
              filterBuilder={branchFilter}
              displayLabel={branchLabel}
              valueKey="id"
              placeholder="Search branch by name or address..."
              mode="form"
              onSelect={handleSelectBranch}
            />
          </div>
        {/if}

        {#if !isInvitation}
          <div class="flex flex-col gap-1.5">
            <label for="reg-password" class="text-sm font-medium text-foreground">
              Password <span class="text-destructive">*</span>
              <span class="text-muted-foreground font-normal text-xs">(min 8 characters)</span>
            </label>
            <input
              id="reg-password"
              type="password"
              bind:value={password}
              placeholder="Password"
              class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
            />
          </div>
        {:else}
          <p class="text-xs text-muted-foreground">
            An SMS invitation will be sent with a link to set the password on the {accountType} app.
          </p>
        {/if}

        <div class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-foreground">Roles</span>
          <RoleMultiSelect bind:roles locked={lockedRoles} />
          <p class="text-xs text-muted-foreground">
            The <code>user</code> role is always assigned. The {accountTypeLabel} role is locked for this account type.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-4">
          <label class="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              bind:checked={isActive}
              class="h-4 w-4 rounded border-border accent-foreground"
            />
            Active
          </label>
          <label class="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              bind:checked={isInvitation}
              class="h-4 w-4 rounded border-border accent-foreground"
            />
            Send invitation (SMS)
          </label>
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
          <Button
            type="submit"
            disabled={loading}
            class="min-w-[120px]"
          >
            {#if loading}
              <Icon iconName="icon/refresh-cw" size={16} class="animate-spin" />
            {/if}
            Register
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}