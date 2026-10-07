<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";
  import { page } from "$app/stores";
  import { fade } from "svelte/transition";
  import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";
  import BranchForm from "$lib/components/admin/branches/BranchForm.svelte";
  import AddCompanyCustomerModal from "$lib/components/admin/companies/AddCompanyCustomerModal.svelte";
  import { getAdminClient } from "$graphql/client";
  import COMPANY_BY_ID from "$graphql/queries/companies/by_id.gql";
  import BRANCHES from "$graphql/queries/branches/branches.gql";
  import DELETE_BRANCH from "$graphql/mutation/branches/delete.gql";
  import COMPANY_CUSTOMERS from "$graphql/queries/company_customers/list_by_company.gql";
  import DELETE_COMPANY_CUSTOMER from "$graphql/mutation/company_customers/remove.gql";
  import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, buildPageList } from "$lib/pagination";

  type BranchRow = {
    id: string;
    name: string;
    address: string;
    company?: { id: string; name: string } | null;
    total_customers?: { aggregate?: { count?: number } };
    stock_value?: { aggregate?: { sum?: { selling_price?: number | string | null } } };
    merchants?: { aggregate?: { count?: number } };
  };

  type CompanyDetail = {
    id: string;
    name: string;
    license: string | null;
    tin_number: number | null;
    created_at: string;
    branches_aggregate?: { aggregate?: { count?: number } };
    company_investors_aggregate?: { aggregate?: { count?: number } };
    company_customers_aggregate?: { aggregate?: { count?: number } };
  };

  type CompanyCustomerRow = {
    id: string;
    created_at: string;
    customer: string;
    company: string;
    branch: string | null;
    customerByCustomer?: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      phone_number: string | null;
    } | null;
    branchByBranch?: { id: string; name: string } | null;
  };

  const companyId = $derived($page.params.id as string);

  let company = $state<CompanyDetail | null>(null);
  let branches = $state<BranchRow[]>([]);
  let companyCustomers = $state<CompanyCustomerRow[]>([]);
  let activeTab = $state<"branches" | "customers">("branches");
  let loading = $state(true);
  let customerLoading = $state(false);
  let error = $state<string | null>(null);

  let branchPage = $state(1);
  let branchLimit = $state<number>(DEFAULT_PAGE_SIZE);
  let branchTotal = $state(0);
  let customerPage = $state(1);
  let customerLimit = $state<number>(DEFAULT_PAGE_SIZE);
  let customerTotal = $state(0);

  let isAddCustomerOpen = $state(false);
  let confirmDetachOpen = $state(false);
  let pendingCustomer = $state<CompanyCustomerRow | null>(null);
  let detachLoading = $state(false);
  let detachError = $state<string | null>(null);

  let confirmDeleteOpen = $state(false);
  let pendingBranch = $state<BranchRow | null>(null);
  let confirmActionLoading = $state(false);
  let confirmError = $state<string | null>(null);

  let isBranchFormOpen = $state(false);
  let editingBranch = $state<BranchRow | null>(null);

  async function loadCompany() {
    try {
      const result = await getAdminClient().query<{ companies_by_pk: CompanyDetail | null }>({
        query: COMPANY_BY_ID,
        variables: { id: companyId },
      });
      company = result.data?.companies_by_pk ?? null;
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load company details.";
    }
  }

  async function loadBranches() {
    try {
      const result = await getAdminClient().query<{
        branches: BranchRow[];
        total: { aggregate: { count: number } };
      }>({
        query: BRANCHES,
        variables: {
          filter: { company: { _eq: companyId } },
          limit: branchLimit,
          offset: (branchPage - 1) * branchLimit,
          order: [{ created_at: "desc" }],
        },
      });
      branches = result.data?.branches ?? [];
      branchTotal = result.data?.total?.aggregate?.count ?? 0;
      const totalPages = Math.max(1, Math.ceil(branchTotal / branchLimit));
      if (branchPage > totalPages && branchTotal > 0) {
        branchPage = totalPages;
        loadBranches();
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load branches.";
    }
  }

  async function loadCompanyCustomers() {
    customerLoading = true;
    try {
      const result = await getAdminClient().query<{
        company_customer: CompanyCustomerRow[];
        total: { aggregate: { count: number } };
      }>({
        query: COMPANY_CUSTOMERS,
        variables: { companyId, limit: customerLimit, offset: (customerPage - 1) * customerLimit },
      });
      companyCustomers = result.data?.company_customer ?? [];
      customerTotal = result.data?.total?.aggregate?.count ?? 0;
      const totalPages = Math.max(1, Math.ceil(customerTotal / customerLimit));
      if (customerPage > totalPages && customerTotal > 0) {
        customerPage = totalPages;
        loadCompanyCustomers();
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load customers.";
    } finally {
      customerLoading = false;
    }
  }

  async function loadAll() {
    loading = true;
    error = null;
    await Promise.all([loadCompany(), loadBranches(), loadCompanyCustomers()]);
    loading = false;
  }

  $effect(() => {
    void $page.params.id;
    loadAll();
  });

  function count(agg: { aggregate?: { count?: number } } | undefined): number {
    return agg?.aggregate?.count ?? 0;
  }

  function setTab(tab: "branches" | "customers") {
    activeTab = tab;
    if (tab === "branches") {
      loadBranches();
    } else {
      loadCompanyCustomers();
    }
  }

  const branchTotalPages = $derived(Math.max(1, Math.ceil(branchTotal / branchLimit)));
  const branchPageStart = $derived(branchTotal === 0 ? 0 : (branchPage - 1) * branchLimit + 1);
  const branchPageEnd = $derived(Math.min(branchPage * branchLimit, branchTotal));
  const customerTotalPages = $derived(Math.max(1, Math.ceil(customerTotal / customerLimit)));
  const customerPageStart = $derived(customerTotal === 0 ? 0 : (customerPage - 1) * customerLimit + 1);
  const customerPageEnd = $derived(Math.min(customerPage * customerLimit, customerTotal));

  function goToBranchPage(p: number) {
    branchPage = p;
    loadBranches();
  }

  function handleBranchLimitChange(e: Event) {
    branchLimit = Number((e.currentTarget as HTMLSelectElement).value) || DEFAULT_PAGE_SIZE;
    branchPage = 1;
    loadBranches();
  }

  function goToCustomerPage(p: number) {
    customerPage = p;
    loadCompanyCustomers();
  }

  function handleCustomerLimitChange(e: Event) {
    customerLimit = Number((e.currentTarget as HTMLSelectElement).value) || DEFAULT_PAGE_SIZE;
    customerPage = 1;
    loadCompanyCustomers();
  }

  function formatDate(iso: string): string {
    if (!iso) return "—";
    try {
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  function formatMoney(value: number | string | null | undefined): string {
    if (value == null) return "—";
    const numericValue = typeof value === "string" ? Number(value.replace(/[$,\s]/g, "")) : value;
    if (!Number.isFinite(numericValue)) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "ETB",
      maximumFractionDigits: 2,
    }).format(numericValue);
  }

  function openAddBranch() {
    editingBranch = null;
    isBranchFormOpen = true;
  }

  function openEditBranch(b: BranchRow) {
    editingBranch = b;
    isBranchFormOpen = true;
  }

  function openDelete(b: BranchRow) {
    pendingBranch = b;
    confirmError = null;
    confirmDeleteOpen = true;
  }

  function pendingLabel(): string {
    return pendingBranch ? pendingBranch.name : "this branch";
  }

  function openAddCustomer() {
    isAddCustomerOpen = true;
  }

  function openDetach(c: CompanyCustomerRow) {
    pendingCustomer = c;
    detachError = null;
    confirmDetachOpen = true;
  }

  function detachLabel(): string {
    const c = pendingCustomer?.customerByCustomer;
    return c ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "this customer" : "this customer";
  }

  async function confirmDetach() {
    if (!pendingCustomer) return;
    detachLoading = true;
    detachError = null;
    try {
      await getAdminClient().mutate({
        mutation: DELETE_COMPANY_CUSTOMER,
        variables: { customerId: pendingCustomer.customer, companyId },
      });
      confirmDetachOpen = false;
      pendingCustomer = null;
      loadCompanyCustomers();
    } catch (e) {
      detachError = e instanceof Error ? e.message : "Failed to detach customer.";
    } finally {
      detachLoading = false;
    }
  }

  async function confirmDelete() {
    if (!pendingBranch) return;
    confirmActionLoading = true;
    confirmError = null;
    try {
      await getAdminClient().mutate({
        mutation: DELETE_BRANCH,
        variables: { id: pendingBranch.id },
      });
      confirmDeleteOpen = false;
      pendingBranch = null;
      loadBranches();
    } catch (e) {
      confirmError = e instanceof Error ? e.message : "Failed to delete branch.";
    } finally {
      confirmActionLoading = false;
    }
  }
</script>

<svelte:head>
  <title>{company ? `${company.name} — BamanStock` : "Company — BamanStock"}</title>
</svelte:head>

<div class="space-y-6" in:fade>
  <div class="flex items-center gap-3">
    <a
      href="/admin/companies"
      class="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      aria-label="Back to companies"
      title="Back to companies"
    >
      <Icon iconName="icon/chevron-left" size={20} />
    </a>
    <h1 class="text-xl font-bold text-foreground">Company Details</h1>
  </div>

  {#if loading && !company}
    <div class="bg-card border border-border rounded-2xl shadow-sm animate-pulse">
      <div class="p-6 space-y-4">
        <div class="w-40 h-5 rounded bg-muted"></div>
        <div class="flex gap-6">
          <div class="w-24 h-12 rounded bg-muted"></div>
          <div class="w-24 h-12 rounded bg-muted"></div>
          <div class="w-24 h-12 rounded bg-muted"></div>
        </div>
      </div>
    </div>
  {:else if error && !company}
    <div class="bg-card border border-border rounded-2xl shadow-sm p-16 text-center">
      <Icon iconName="icon/alert-circle" size={24} class="text-rose-500 inline mr-2" />
      <span class="text-muted-foreground">Failed to load company — {error}</span>
    </div>
  {:else if company}
    <div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div class="p-6 border-b border-border flex items-start justify-between flex-wrap gap-4">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center flex-shrink-0">
            <Icon iconName="icon/building" size={24} class="text-info" />
          </div>
          <div>
            <h2 class="text-2xl font-bold text-foreground">{company.name}</h2>
            <div class="flex items-center gap-2 mt-1 flex-wrap">
              <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-muted-foreground">
                License: {company.license ?? "—"}
              </span>
              <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
                TIN: {company.tin_number ?? "—"}
              </span>
            </div>
          </div>
        </div>
        <div class="text-right text-sm text-muted-foreground">
          <div class="font-medium text-foreground">Member since</div>
          <div>{formatDate(company.created_at)}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <div class="p-6 text-center">
          <div class="text-3xl font-bold text-foreground">{count(company.branches_aggregate)}</div>
          <div class="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
            <Icon iconName="icon/store" size={14} /> Branches
          </div>
        </div>
        <div class="p-6 text-center">
          <div class="text-3xl font-bold text-foreground">{count(company.company_investors_aggregate)}</div>
          <div class="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
            <Icon iconName="icon/users" size={14} /> Investors
          </div>
        </div>
        <div class="p-6 text-center">
          <div class="text-3xl font-bold text-foreground">{count(company.company_customers_aggregate)}</div>
          <div class="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
            <Icon iconName="icon/users" size={14} /> Customers
          </div>
        </div>
      </div>
    </div>

    <div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div class="flex items-center border-b border-border px-4">
        <button
          type="button"
          data-tab="branches"
          onclick={() => setTab("branches")}
          class={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "branches"
              ? "border-[#4D8DEE] text-[#4D8DEE]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon iconName="icon/store" size={16} /> Branches
        </button>
        <button
          type="button"
          data-tab="customers"
          onclick={() => setTab("customers")}
          class={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "customers"
              ? "border-[#4D8DEE] text-[#4D8DEE]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon iconName="icon/users" size={16} /> Customers
        </button>
      </div>

      {#if activeTab === "branches"}
        <div class="bg-card border border-border rounded-b-2xl shadow-sm min-h-[300px]">
          <div class="p-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
            <h3 class="text-base font-bold text-foreground flex items-center gap-2">
              <Icon iconName="icon/store" size={18} class="text-info" />
              Branches
            </h3>
            <button
              onclick={openAddBranch}
              class="flex items-center gap-2 bg-[#4D8DEE] text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm hover:opacity-90"
            >
              <Icon iconName="icon/plus" size={16} /> Add Branch
            </button>
          </div>

          <table class="w-full text-sm">
            <thead class="bg-muted/80 text-muted-foreground font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th class="px-6 py-4 text-left">Branch</th>
                <th class="px-6 py-4 text-left">Address</th>
                <th class="px-6 py-4 text-center">Customers</th>
                <th class="px-6 py-4 text-center">Merchants</th>
                <th class="px-6 py-4 text-right">Stock Value</th>
                <th class="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              {#if loading}
                {#each Array(3) as _, i}
                  <tr class="animate-pulse">
                    <td class="px-6 py-4"><div class="w-40 h-3 rounded bg-muted"></div></td>
                    <td class="px-6 py-4"><div class="w-56 h-3 rounded bg-muted"></div></td>
                    <td class="px-6 py-4"><div class="w-10 h-3 mx-auto rounded bg-muted"></div></td>
                    <td class="px-6 py-4"><div class="w-10 h-3 mx-auto rounded bg-muted"></div></td>
                    <td class="px-6 py-4"><div class="w-20 h-3 ml-auto rounded bg-muted"></div></td>
                    <td class="px-6 py-4"><div class="w-16 h-3 ml-auto rounded bg-muted"></div></td>
                  </tr>
                {/each}
              {:else if branches.length === 0}
                <tr>
                  <td colspan="6" class="px-6 py-16 text-center">
                    <Icon iconName="icon/store" size={24} class="text-muted-foreground inline mr-2" />
                    <span class="text-muted-foreground">No branches registered under this company yet.</span>
                  </td>
                </tr>
              {:else}
                {#each branches as b}
                  <tr class="hover:bg-muted/50">
                    <td class="px-6 py-4 font-bold flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
                        <Icon iconName="icon/store" size={16} class="text-info" />
                      </div>
                      {b.name}
                    </td>
                    <td class="px-6 py-4 text-muted-foreground">{b.address}</td>
                    <td class="px-6 py-4 text-center">
                      <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-muted-foreground">
                        {count(b.total_customers)}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-info/10 text-info">
                        {count(b.merchants)}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-right font-semibold text-foreground">
                      {formatMoney(b.stock_value?.aggregate?.sum?.selling_price ?? null)}
                    </td>
                    <td class="px-6 py-4 text-right">
                      <button
                        title="Edit branch"
                        onclick={() => openEditBranch(b)}
                        class="p-1.5 text-muted-foreground hover:text-blue-500"
                      >
                        <Icon iconName="icon/edit" size={16} />
                      </button>
                      <button
                        title="Delete branch"
                        onclick={() => openDelete(b)}
                        class="p-1.5 text-muted-foreground hover:text-rose-500"
                      >
                        <Icon iconName="icon/trash" size={16} />
                      </button>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>

          <div class="p-4 border-t border-border flex items-center justify-between text-muted-foreground text-sm flex-wrap gap-3">
            <div class="flex items-center gap-2">
              Row Per Page
              <select
                value={branchLimit}
                onchange={handleBranchLimitChange}
                class="bg-muted border border-border rounded px-2 py-1 outline-none"
              >
                {#each PAGE_SIZE_OPTIONS as sizeOption}
                  <option value={sizeOption}>{sizeOption}</option>
                {/each}
              </select>
              <span>{branchTotal === 0 ? "0 entries" : `Showing ${branchPageStart}–${branchPageEnd} of ${branchTotal} entries`}</span>
            </div>
            {#if branchTotalPages > 1}
              <div class="flex items-center gap-1">
                <button
                  onclick={() => goToBranchPage(Math.max(1, branchPage - 1))}
                  disabled={branchPage === 1}
                  class="p-1 hover:text-blue-600 disabled:opacity-30"
                  aria-label="Previous page"
                >
                  <Icon iconName="icon/chevron-left" size={16} />
                </button>
                {#each buildPageList(branchPage, branchTotalPages) as p}
                  {#if p === "…"}
                    <span class="px-1 text-xs">…</span>
                  {:else}
                    <button
                      onclick={() => goToBranchPage(p)}
                      class={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${
                        p === branchPage ? "bg-[#4D8DEE] text-white" : "hover:bg-muted"
                      }`}
                    >
                      {p}
                    </button>
                  {/if}
                {/each}
                <button
                  onclick={() => goToBranchPage(Math.min(branchTotalPages, branchPage + 1))}
                  disabled={branchPage === branchTotalPages}
                  class="p-1 hover:text-blue-600 disabled:opacity-30"
                  aria-label="Next page"
                >
                  <Icon iconName="icon/chevron-right" size={16} />
                </button>
              </div>
            {/if}
          </div>
        </div>
      {:else}
        <div class="bg-card border border-border rounded-b-2xl shadow-sm min-h-[300px]">
          <div class="p-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
            <h3 class="text-base font-bold text-foreground flex items-center gap-2">
              <Icon iconName="icon/users" size={18} class="text-purple-600" />
              Customers
            </h3>
            <button
              onclick={openAddCustomer}
              class="flex items-center gap-2 bg-[#4D8DEE] text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm hover:opacity-90"
            >
              <Icon iconName="icon/plus" size={16} /> Add Customer
            </button>
          </div>

          <table class="w-full text-sm">
            <thead class="bg-muted/80 text-muted-foreground font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th class="px-6 py-4 text-left">Customer</th>
                <th class="px-6 py-4 text-left">Phone</th>
                <th class="px-6 py-4 text-left">Branch</th>
                <th class="px-6 py-4 text-left">Added On</th>
                <th class="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              {#if customerLoading}
                {#each Array(3) as _, i}
                  <tr class="animate-pulse">
                    <td class="px-6 py-4"><div class="w-40 h-3 rounded bg-muted"></div></td>
                    <td class="px-6 py-4"><div class="w-28 h-3 rounded bg-muted"></div></td>
                    <td class="px-6 py-4"><div class="w-32 h-3 rounded bg-muted"></div></td>
                    <td class="px-6 py-4"><div class="w-20 h-3 rounded bg-muted"></div></td>
                    <td class="px-6 py-4"><div class="w-10 h-3 ml-auto rounded bg-muted"></div></td>
                  </tr>
                {/each}
              {:else if companyCustomers.length === 0}
                <tr>
                  <td colspan="5" class="px-6 py-16 text-center">
                    <Icon iconName="icon/users" size={24} class="text-muted-foreground inline mr-2" />
                    <span class="text-muted-foreground">No customers linked to this company yet.</span>
                  </td>
                </tr>
              {:else}
                {#each companyCustomers as cc}
                  {@const person = cc.customerByCustomer}
                  <tr class="hover:bg-muted/50">
                    <td class="px-6 py-4 font-bold flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                        <Icon iconName="icon/user" size={16} />
                      </div>
                      {`${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim() || "—"}
                    </td>
                    <td class="px-6 py-4 text-muted-foreground">{person?.phone_number ?? "—"}</td>
                    <td class="px-6 py-4 text-muted-foreground">
                      {#if cc.branchByBranch}
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-info/10 text-info">
                          <Icon iconName="icon/store" size={12} />
                          {cc.branchByBranch.name}
                        </span>
                      {:else}
                        —
                      {/if}
                    </td>
                    <td class="px-6 py-4 text-muted-foreground">{formatDate(cc.created_at)}</td>
                    <td class="px-6 py-4 text-right">
                      <button
                        title="Detach customer"
                        onclick={() => openDetach(cc)}
                        class="p-1.5 text-muted-foreground hover:text-rose-500"
                      >
                        <Icon iconName="icon/user-minus" size={16} />
                      </button>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>

          <div class="p-4 border-t border-border flex items-center justify-between text-muted-foreground text-sm flex-wrap gap-3">
            <div class="flex items-center gap-2">
              Row Per Page
              <select
                value={customerLimit}
                onchange={handleCustomerLimitChange}
                class="bg-muted border border-border rounded px-2 py-1 outline-none"
              >
                {#each PAGE_SIZE_OPTIONS as sizeOption}
                  <option value={sizeOption}>{sizeOption}</option>
                {/each}
              </select>
              <span>{customerTotal === 0 ? "0 entries" : `Showing ${customerPageStart}–${customerPageEnd} of ${customerTotal} entries`}</span>
            </div>
            {#if customerTotalPages > 1}
              <div class="flex items-center gap-1">
                <button
                  onclick={() => goToCustomerPage(Math.max(1, customerPage - 1))}
                  disabled={customerPage === 1}
                  class="p-1 hover:text-blue-600 disabled:opacity-30"
                  aria-label="Previous page"
                >
                  <Icon iconName="icon/chevron-left" size={16} />
                </button>
                {#each buildPageList(customerPage, customerTotalPages) as p}
                  {#if p === "…"}
                    <span class="px-1 text-xs">…</span>
                  {:else}
                    <button
                      onclick={() => goToCustomerPage(p)}
                      class={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${
                        p === customerPage ? "bg-[#4D8DEE] text-white" : "hover:bg-muted"
                      }`}
                    >
                      {p}
                    </button>
                  {/if}
                {/each}
                <button
                  onclick={() => goToCustomerPage(Math.min(customerTotalPages, customerPage + 1))}
                  disabled={customerPage === customerTotalPages}
                  class="p-1 hover:text-blue-600 disabled:opacity-30"
                  aria-label="Next page"
                >
                  <Icon iconName="icon/chevron-right" size={16} />
                </button>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<ConfirmModal
  bind:isOpen={confirmDeleteOpen}
  title="Delete branch"
  icon="icon/trash"
  message={`Are you sure you want to delete branch <strong>${pendingLabel()}</strong>? This action cannot be undone.`}
  error={confirmError}
  confirmText="Delete"
  loading={confirmActionLoading}
  onConfirm={confirmDelete}
/>
<BranchForm
  bind:isOpen={isBranchFormOpen}
  {companyId}
  branch={editingBranch}
  onSuccess={loadBranches}
/>
<ConfirmModal
  bind:isOpen={confirmDetachOpen}
  title="Detach customer"
  icon="icon/user-minus"
  message={`Are you sure you want to detach <strong>${detachLabel()}</strong> from this company? The customer profile itself will be kept.`}
  error={detachError}
  confirmText="Detach"
  loading={detachLoading}
  onConfirm={confirmDetach}
/>
<AddCompanyCustomerModal
  bind:isOpen={isAddCustomerOpen}
  {companyId}
  onSuccess={loadCompanyCustomers}
/>