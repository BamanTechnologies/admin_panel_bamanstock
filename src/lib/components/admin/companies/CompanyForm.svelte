<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import Icon from "$lib/components/ui/Icon/index.js";
  import CompanyRelationPicker from "$lib/components/admin/companies/CompanyRelationPicker.svelte";
  import { getAdminClient } from "$graphql/client";
  import INSERT_COMPANY from "$graphql/mutation/companies/insert.gql";
  import UPDATE_COMPANY from "$graphql/mutation/companies/update.gql";
  import COMPANY_BY_ID from "$graphql/queries/companies/by_id.gql";
  import INVESTORS from "$graphql/queries/selector/investors.gql";
  import CUSTOMERS from "$graphql/queries/selector/customers.gql";

  type SelectItem = Record<string, any>;
  type Option = { id: string; label: string };
  type CompanyRow = {
    id: string;
    name: string;
    license: string | null;
    tin_number: number | null;
  };

  let {
    isOpen = $bindable(false),
    company = null as CompanyRow | null,
    onSuccess = () => {},
    onClose = () => {},
  } = $props();

  let name = $state("");
  let license = $state("");
  let tinNumber = $state<string | number>("");
  let selectedInvestors = $state<Option[]>([]);
  let selectedCustomers = $state<Option[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let isEditing = $derived(!!company);

  function personLabel(item: SelectItem) {
    return `${item.first_name ?? ""} ${item.last_name ?? ""}${
      item.phone_number ? ` · ${item.phone_number}` : ""
    }`.trim();
  }

  function dedupeByIdentity(options: Option[]): Option[] {
    const seen = new Set<string>();
    return options.filter((o) => {
      const key = o.label.trim().toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function firstNameFilter(search: string) {
    return {
      _or: [
        { first_name: { _ilike: `%${search}%` } },
        { last_name: { _ilike: `%${search}%` } },
        { phone_number: { _ilike: `%${search}%` } },
      ],
    };
  }

  function resetForm() {
    name = "";
    license = "";
    tinNumber = "";
    selectedInvestors = [];
    selectedCustomers = [];
    error = null;
  }

  async function loadForEdit(id: string) {
    try {
const result = await getAdminClient().query<{
          companies_by_pk: {
            name: string;
            license: string | null;
            tin_number: number | null;
          company_investors: { investorByInvestor: SelectItem }[];
          company_customers: { customerByCustomer: SelectItem }[];
        } | null;
      }>({
        query: COMPANY_BY_ID,
        variables: { id },
      });
      const row = result.data?.companies_by_pk;
      if (!row) return;
      name = row.name ?? "";
      license = row.license ?? "";
      tinNumber = row.tin_number ?? "";
      selectedInvestors = (row.company_investors ?? []).map((r) => ({
        id: r.investorByInvestor.id,
        label: personLabel(r.investorByInvestor),
      }));
      selectedCustomers = (row.company_customers ?? []).map((r) => ({
        id: r.customerByCustomer.id,
        label: personLabel(r.customerByCustomer),
      }));
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load company details.";
    }
  }

  $effect(() => {
    if (isOpen) {
      error = null;
      if (company) {
        loadForEdit(company.id);
      } else {
        resetForm();
      }
    }
  });

  function handleClose() {
    if (loading) return;
    isOpen = false;
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    if (loading) return;
    if (!name.trim()) {
      error = "Company name is required.";
      return;
    }
    error = null;
    loading = true;
    try {
      const client = getAdminClient();
      const scalar = {
        name: name.trim(),
        license: license.trim() || null,
        tin_number: String(tinNumber).trim() ? Number(tinNumber) : null,
      };
      if (company) {
        await client.mutate({
          mutation: UPDATE_COMPANY,
          variables: {
            id: company.id,
            set: scalar,
            investors: selectedInvestors.map((i) => ({ company: company.id, investor: i.id })),
            customers: dedupeByIdentity(selectedCustomers).map((c) => ({ company: company.id, customer: c.id })),
          },
        });
      } else {
        const input: Record<string, unknown> = { ...scalar };
        if (selectedInvestors.length > 0) {
          input.company_investors = { data: selectedInvestors.map((i) => ({ investor: i.id })) };
        }
        if (selectedCustomers.length > 0) {
          input.company_customers = { data: dedupeByIdentity(selectedCustomers).map((c) => ({ customer: c.id })) };
        }
        await client.mutate({
          mutation: INSERT_COMPANY,
          variables: { input },
        });
      }
      isOpen = false;
      resetForm();
      onSuccess();
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to save company.";
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
    aria-labelledby="company-form-title"
  >
    <div
      class="bg-card rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="flex items-center justify-between p-6 border-b border-border">
        <h2 id="company-form-title" class="text-xl font-bold text-foreground">
          {isEditing ? "Edit Company" : "Add Company"}
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
          <label for="company-name" class="text-sm font-medium text-foreground">
            Company name <span class="text-destructive">*</span>
          </label>
          <input
            id="company-name"
            type="text"
            bind:value={name}
            placeholder="Company name"
            class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label for="company-license" class="text-sm font-medium text-foreground">
              License
            </label>
            <input
              id="company-license"
              type="text"
              bind:value={license}
              placeholder="License number"
              class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="company-tin" class="text-sm font-medium text-foreground">
              TIN number
            </label>
            <input
              id="company-tin"
              type="number"
              step="any"
              min="0"
              bind:value={tinNumber}
              placeholder="TIN number"
              class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-foreground">Company investors</span>
          <CompanyRelationPicker
            query={INVESTORS}
            dataKey="investor"
            filterBuilder={firstNameFilter}
            displayLabel={personLabel}
            valueKey="id"
            placeholder="Search investors to attach..."
            bind:selected={selectedInvestors}
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-foreground">Company customers</span>
          <CompanyRelationPicker
            query={CUSTOMERS}
            dataKey="customers"
            filterBuilder={firstNameFilter}
            displayLabel={personLabel}
            valueKey="id"
            placeholder="Search customers to attach..."
            bind:selected={selectedCustomers}
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
          <Button
            type="submit"
            disabled={loading}
            class="min-w-[120px]"
          >
            {#if loading}
              <Icon iconName="icon/refresh-cw" size={16} class="animate-spin" />
            {/if}
            {isEditing ? "Save Changes" : "Add Company"}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}