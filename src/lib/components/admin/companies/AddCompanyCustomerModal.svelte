<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import Icon from "$lib/components/ui/Icon/index.js";
  import CompanyRelationPicker from "$lib/components/admin/companies/CompanyRelationPicker.svelte";
  import { getAdminClient } from "$graphql/client";
  import CUSTOMERS from "$graphql/queries/selector/customers.gql";
  import BRANCHES from "$graphql/queries/branches/searchSelect.gql";
  import INSERT_COMPANY_CUSTOMER from "$graphql/mutation/company_customers/insert.gql";

  type SelectItem = Record<string, any>;
  type Option = { id: string; label: string; status?: boolean };

  let {
    isOpen = $bindable(false),
    companyId = "",
    onSuccess = () => {},
    onClose = () => {},
  } = $props();

  let selectedCustomer = $state<Option[]>([]);
  let selectedBranch = $state<Option[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);

  function personLabel(item: SelectItem) {
    return `${item.first_name ?? ""} ${item.last_name ?? ""}${
      item.phone_number ? ` · ${item.phone_number}` : ""
    }`.trim();
  }

  function branchLabel(item: SelectItem) {
    return `${item.name ?? ""}${item.address ? ` · ${item.address}` : ""}`.trim();
  }

  function customerFilterer(search: string) {
    const conditions: Record<string, unknown>[] = [];
    if (search.trim()) {
      conditions.push({
        _or: [
          { first_name: { _ilike: `%${search}%` } },
          { last_name: { _ilike: `%${search}%` } },
          { phone_number: { _ilike: `%${search}%` } },
        ],
      });
    }
    conditions.push({ _not: { company_customers: { company: { _eq: companyId } } } });
    return conditions.length > 1 ? { _and: conditions } : conditions[0];
  }

  function branchFilterer(search: string) {
    const comp = { company: { _eq: companyId } };
    if (!search.trim()) return comp;
    return { _and: [comp, { name: { _ilike: `%${search}%` } }] };
  }

  $effect(() => {
    if (isOpen) {
      error = null;
      selectedCustomer = [];
      selectedBranch = [];
    }
  });

  function handleClose() {
    if (loading) return;
    isOpen = false;
    selectedCustomer = [];
    selectedBranch = [];
    error = null;
    onClose();
  }

  async function handleSubmit() {
    if (loading) return;
    if (selectedCustomer.length === 0) {
      error = "Please select a customer to add.";
      return;
    }
    error = null;
    loading = true;
    try {
      await getAdminClient().mutate({
        mutation: INSERT_COMPANY_CUSTOMER,
        variables: {
          object: {
            customer: selectedCustomer[0].id,
            company: companyId,
            branch: selectedBranch.length > 0 ? selectedBranch[0].id : null,
          },
        },
      });
      isOpen = false;
      selectedCustomer = [];
      selectedBranch = [];
      onSuccess();
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to add customer.";
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
    aria-labelledby="add-customer-modal-title"
  >
    <div
      class="bg-card rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="flex items-center justify-between p-6 border-b border-border">
        <h2 id="add-customer-modal-title" class="text-xl font-bold text-foreground">
          Add Customer
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

        <div class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-foreground">
            Customer <span class="text-destructive">*</span>
          </span>
          <CompanyRelationPicker
            query={CUSTOMERS}
            dataKey="customers"
            filterBuilder={customerFilterer}
            displayLabel={personLabel}
            valueKey="id"
            single
            placeholder="Search customers not linked to this company..."
            bind:selected={selectedCustomer}
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-foreground">
            Branch <span class="text-muted-foreground">(optional)</span>
          </span>
          <CompanyRelationPicker
            query={BRANCHES}
            dataKey="branches"
            filterBuilder={branchFilterer}
            displayLabel={branchLabel}
            valueKey="id"
            single
            placeholder="Search branch of this company..."
            bind:selected={selectedBranch}
          />
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
            Add Customer
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}