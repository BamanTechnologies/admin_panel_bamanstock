<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";
  import { page } from "$app/stores";
  import { fade } from "svelte/transition";
  import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";
  import CustomerForm from "$lib/components/admin/customers/CustomerForm.svelte";
  import { getAdminClient } from "$graphql/client";
  import LIST_CUSTOMERS from "$graphql/queries/customers/list.gql";
  import DELETE_CUSTOMER from "$graphql/mutation/customers/delete.gql";
  import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, buildPageList } from "$lib/pagination";

  type CustomerRow = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
    address: string | null;
    created_at: string;
    total_orders?: { aggregate?: { count?: number } };
    total_unpayed_or_partially_Payed_orders?: { aggregate?: { count?: number } };
  };

  type SortKey = "last_name" | "phone_number" | "created_at";

  const SORTABLE: Record<string, { label: string; key: SortKey }> = {
    name: { label: "Customer", key: "last_name" },
    phone_number: { label: "Phone", key: "phone_number" },
    created_at: { label: "Created At", key: "created_at" },
  };

  let search = $state("");
  let sortKey = $state<SortKey>("created_at");
  let sortDir = $state<"asc" | "desc">("desc");
  let pageNumber = $state(1);
  let limit = $state<number>(DEFAULT_PAGE_SIZE);

  let customers = $state<CustomerRow[]>([]);
  let total = $state(0);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let searchDebounce: ReturnType<typeof setTimeout>;
  let confirmDeleteOpen = $state(false);
  let isFormOpen = $state(false);
  let editingCustomer = $state<CustomerRow | null>(null);
  let pendingIds = $state<string[]>([]);
  let confirmActionLoading = $state(false);
  let confirmError = $state<string | null>(null);

  function seedFromUrl() {
    const p = new URLSearchParams($page.url.search);
    search = p.get("q") ?? "";
    const limitNum = Number(p.get("limit"));
    limit = PAGE_SIZE_OPTIONS.includes(limitNum as (typeof PAGE_SIZE_OPTIONS)[number]) ? limitNum : DEFAULT_PAGE_SIZE;
    sortKey = Object.values(SORTABLE).some((c) => c.key === p.get("sort"))
      ? (p.get("sort") as SortKey)
      : "created_at";
    sortDir = p.get("dir") === "asc" ? "asc" : "desc";
    pageNumber = Math.max(1, Number(p.get("page")) || 1);
  }

  function toUrlParams(): URLSearchParams {
    const p = new URLSearchParams();
    if (search.trim()) p.set("q", search.trim());
    p.set("page", String(pageNumber));
    p.set("limit", String(limit));
    p.set("sort", sortKey);
    p.set("dir", sortDir);
    return p;
  }

  function syncToUrl() {
    const next = toUrlParams().toString();
    const current = new URLSearchParams(window.location.search).toString();
    if (next !== current) {
      history.replaceState(history.state, "", `?${next}`);
    }
    loadData();
  }

  function handleSearchInput() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      pageNumber = 1;
      syncToUrl();
    }, 400);
  }

  function handleSort(label: string) {
    const entry = Object.values(SORTABLE).find((c) => c.label === label);
    if (!entry) return;
    if (entry.key === sortKey) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortKey = entry.key;
      sortDir = "asc";
    }
    pageNumber = 1;
    syncToUrl();
  }

  function handleLimitChange(e: Event) {
    limit = Number((e.currentTarget as HTMLSelectElement).value) || DEFAULT_PAGE_SIZE;
    pageNumber = 1;
    syncToUrl();
  }

  function goToPage(p: number) {
    pageNumber = p;
    syncToUrl();
  }

  function buildFilter(): Record<string, unknown> {
    if (!search.trim()) return {};
    const q = search.trim();
    return {
      _or: [
        { first_name: { _ilike: `%${q}%` } },
        { last_name: { _ilike: `%${q}%` } },
        { phone_number: { _ilike: `%${q}%` } },
        { address: { _ilike: `%${q}%` } },
      ],
    };
  }

  async function loadData() {
    loading = true;
    error = null;
    try {
      const client = getAdminClient();
      const result = await client.query<{
        customers: CustomerRow[];
        total: { aggregate: { count: number } };
      }>({
        query: LIST_CUSTOMERS,
        variables: {
          filter: buildFilter(),
          limit,
          offset: (pageNumber - 1) * limit,
          order: [{ [sortKey]: sortDir }],
        },
      });
      customers = result.data?.customers ?? [];
      total = result.data?.total?.aggregate?.count ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      if (pageNumber > totalPages && total > 0) {
        pageNumber = totalPages;
        syncToUrl();
        return;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load customers.";
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void $page.url;
    loadData();
  });

  seedFromUrl();

  const totalPages = $derived(Math.max(1, Math.ceil(total / limit)));
  const pageStart = $derived(total === 0 ? 0 : (pageNumber - 1) * limit + 1);
  const pageEnd = $derived(Math.min(pageNumber * limit, total));

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

  function count(agg: { aggregate?: { count?: number } } | undefined): number {
    return agg?.aggregate?.count ?? 0;
  }

  function fullName(c: CustomerRow): string {
    return `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
  }

  function openDelete(ids: string[]) {
    pendingIds = ids;
    confirmError = null;
    confirmDeleteOpen = true;
  }

  function pendingLabel(): string {
    const c = customers.find((x) => x.id === pendingIds[0]);
    return c ? fullName(c) : "this customer";
  }

  async function confirmDelete() {
    confirmActionLoading = true;
    confirmError = null;
    try {
      await getAdminClient().mutate({
        mutation: DELETE_CUSTOMER,
        variables: { id: pendingIds[0] },
      });
      confirmDeleteOpen = false;
      loadData();
    } catch (e) {
      confirmError = e instanceof Error ? e.message : "Failed to delete.";
    } finally {
      confirmActionLoading = false;
    }
  }

  function openAdd() {
    editingCustomer = null;
    isFormOpen = true;
  }

  function openEdit(c: CustomerRow) {
    editingCustomer = c;
    isFormOpen = true;
  }
</script>

<svelte:head>
  <title>Customers — BamanStock</title>
</svelte:head>

<div class="space-y-6" in:fade>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-bold text-foreground">Customers</h1>
    </div>
    <div class="flex items-center gap-3">
      <button
        onclick={openAdd}
        class="flex items-center gap-2 bg-[#4D8DEE] text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm hover:opacity-90"
      >
        <Icon iconName="icon/plus" size={16} /> Add Customer
      </button>
    </div>
  </div>

  <div class="bg-card border border-border rounded-2xl shadow-sm min-h-[500px] relative overflow-hidden">
    {#if loading && customers.length > 0}
      <div class="absolute top-0 left-0 right-0 h-0.5 bg-info/20 overflow-hidden">
        <div class="h-full w-full origin-left animate-[loadbar_1.2s_ease-in-out_infinite] bg-[#4D8DEE]"></div>
      </div>
    {/if}

    <div class="p-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
      <div class="relative w-80">
        <Icon iconName="icon/search" size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, phone or address"
          bind:value={search}
          oninput={handleSearchInput}
          class="w-full bg-muted border border-border rounded-xl py-2 pl-10 pr-4 text-sm"
        />
      </div>
    </div>

    <table class="w-full text-sm">
      <thead class="bg-muted/80 text-muted-foreground font-bold uppercase text-[11px] tracking-wider">
        <tr>
          <th class="px-6 py-4 text-left cursor-pointer select-none" onclick={() => handleSort("Customer")}>
            Customer
            <Icon iconName={sortKey === 'last_name' ? (sortDir === 'asc' ? 'icon/arrow-up' : 'icon/arrow-down') : 'icon/chevron-up'} size={12} class="inline opacity-50" />
          </th>
          <th class="px-6 py-4 text-left cursor-pointer select-none" onclick={() => handleSort("Phone")}>
            Phone
            <Icon iconName={sortKey === 'phone_number' ? (sortDir === 'asc' ? 'icon/arrow-up' : 'icon/arrow-down') : 'icon/chevron-up'} size={12} class="inline opacity-50" />
          </th>
          <th class="px-6 py-4 text-left">Address</th>
          <th class="px-6 py-4 text-center">Orders</th>
          <th class="px-6 py-4 text-center">Outstanding</th>
          <th class="px-6 py-4 text-left cursor-pointer select-none" onclick={() => handleSort("Created At")}>
            Created At
            <Icon iconName={sortKey === 'created_at' ? (sortDir === 'asc' ? 'icon/arrow-up' : 'icon/arrow-down') : 'icon/chevron-up'} size={12} class="inline opacity-50" />
          </th>
          <th class="px-6 py-4 text-right">Action</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-50">
        {#if loading && customers.length === 0}
          {#each Array(6) as _, i}
            <tr class="animate-pulse">
              <td class="px-6 py-4"><div class="w-40 h-3 rounded bg-muted"></div></td>
              <td class="px-6 py-4"><div class="w-28 h-3 rounded bg-muted"></div></td>
              <td class="px-6 py-4"><div class="w-48 h-3 rounded bg-muted"></div></td>
              <td class="px-6 py-4"><div class="w-10 h-3 mx-auto rounded bg-muted"></div></td>
              <td class="px-6 py-4"><div class="w-10 h-3 mx-auto rounded bg-muted"></div></td>
              <td class="px-6 py-4"><div class="w-20 h-3 rounded bg-muted"></div></td>
              <td class="px-6 py-4"><div class="w-16 h-3 ml-auto rounded bg-muted"></div></td>
            </tr>
          {/each}
        {:else if customers.length === 0}
          <tr>
            <td colspan="7" class="px-6 py-16 text-center">
              {#if error}
                <Icon iconName="icon/alert-circle" size={24} class="text-rose-500 inline mr-2" />
                <span class="text-muted-foreground">Failed to load customers — {error}</span>
              {:else}
                <Icon iconName="icon/users" size={24} class="text-muted-foreground inline mr-2" />
                <span class="text-muted-foreground">No customers found.</span>
              {/if}
            </td>
          </tr>
        {:else}
          {#each customers as c}
            <tr class="hover:bg-muted/50">
              <td class="px-6 py-4 font-bold flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <Icon iconName="icon/user" size={16} />
                </div>
                {fullName(c) || "—"}
              </td>
              <td class="px-6 py-4 text-muted-foreground">{c.phone_number ?? "—"}</td>
              <td class="px-6 py-4 text-muted-foreground">{c.address ?? "—"}</td>
              <td class="px-6 py-4 text-center">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-muted-foreground">
                  {count(c.total_orders)}
                </span>
              </td>
              <td class="px-6 py-4 text-center">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-600">
                  {count(c.total_unpayed_or_partially_Payed_orders)}
                </span>
              </td>
              <td class="px-6 py-4 text-muted-foreground">{formatDate(c.created_at)}</td>
              <td class="px-6 py-4 text-right">
                <button
                  title="Edit"
                  onclick={() => openEdit(c)}
                  class="p-1.5 text-muted-foreground hover:text-blue-500"
                >
                  <Icon iconName="icon/edit" size={16} />
                </button>
                <button
                  title="Delete"
                  onclick={() => openDelete([c.id])}
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
          value={limit}
          onchange={handleLimitChange}
          class="bg-muted border border-border rounded px-2 py-1 outline-none"
        >
          {#each PAGE_SIZE_OPTIONS as sizeOption}
            <option value={sizeOption}>{sizeOption}</option>
          {/each}
        </select>
        <span>{total === 0 ? "0 entries" : `Showing ${pageStart}–${pageEnd} of ${total} entries`}</span>
      </div>
      {#if totalPages > 1}
        <div class="flex items-center gap-1">
          <button
            onclick={() => goToPage(Math.max(1, pageNumber - 1))}
            disabled={pageNumber === 1}
            class="p-1 hover:text-blue-600 disabled:opacity-30"
            aria-label="Previous page"
          >
            <Icon iconName="icon/chevron-left" size={16} />
          </button>
          {#each buildPageList(pageNumber, totalPages) as p}
            {#if p === "…"}
              <span class="px-1 text-xs">…</span>
            {:else}
              <button
                onclick={() => goToPage(p)}
                class={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${
                  p === pageNumber ? "bg-[#4D8DEE] text-white" : "hover:bg-muted"
                }`}
              >
                {p}
              </button>
            {/if}
          {/each}
          <button
            onclick={() => goToPage(Math.min(totalPages, pageNumber + 1))}
            disabled={pageNumber === totalPages}
            class="p-1 hover:text-blue-600 disabled:opacity-30"
            aria-label="Next page"
          >
            <Icon iconName="icon/chevron-right" size={16} />
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<ConfirmModal
  bind:isOpen={confirmDeleteOpen}
  title="Delete customer"
  icon="icon/trash"
  message={`Are you sure you want to delete <strong>${pendingLabel()}</strong>? This action cannot be undone.`}
  error={confirmError}
  confirmText="Delete"
  loading={confirmActionLoading}
  onConfirm={confirmDelete}
/>
<CustomerForm
  bind:isOpen={isFormOpen}
  customer={editingCustomer}
  onSuccess={() => loadData()}
/>

<style>
  @keyframes loadbar {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }
</style>