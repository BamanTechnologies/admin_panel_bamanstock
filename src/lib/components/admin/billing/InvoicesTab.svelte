<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";
  import InvoicePreviewModal from "$lib/components/admin/billing/InvoicePreviewModal.svelte";
  import { getAdminClient } from "$graphql/client";
  import INVOICES from "$graphql/queries/billing/invoices.gql";
  import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, buildPageList } from "$lib/pagination";
  import {
    formatCurrency,
    formatDate,
    frequencyLabel,
    type BillingInvoice,
  } from "$lib/billing/index.js";

  // When `companyId` is set the list is scoped to that company and the company
  // column is hidden (used on the company detail page).
  let { onChanged = () => {}, companyId }: { onChanged?: () => void; companyId?: string } = $props();

  let rows = $state<BillingInvoice[]>([]);
  let total = $state(0);
  let amount = $state(0);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let search = $state("");
  let pageNumber = $state(1);
  let limit = $state<number>(DEFAULT_PAGE_SIZE);

  let isPreviewOpen = $state(false);
  let selectedInvoice = $state<BillingInvoice | null>(null);

  let searchDebounce: ReturnType<typeof setTimeout>;

  const totalPages = $derived(Math.max(1, Math.ceil(total / limit)));
  const pageStart = $derived(total === 0 ? 0 : (pageNumber - 1) * limit + 1);
  const pageEnd = $derived(Math.min(pageNumber * limit, total));

  function buildFilter(): Record<string, unknown> {
    const clauses: Record<string, unknown>[] = [{ is_deleted: { _eq: false } }];
    if (companyId) clauses.push({ company_id: { _eq: companyId } });
    if (search.trim()) {
      const q = search.trim();
      clauses.push({
        _or: [
          { invoice_number: { _ilike: `%${q}%` } },
          { transaction_id: { _ilike: `%${q}%` } },
          { company: { name: { _ilike: `%${q}%` } } },
        ],
      });
    }
    return { _and: clauses };
  }

  async function load() {
    loading = true;
    error = null;
    try {
      const result = await getAdminClient().query<{
        billing_invoices: BillingInvoice[];
        total: { aggregate: { count: number } };
        amount: { aggregate: { sum: { total: number | null } } };
      }>({
        query: INVOICES,
        variables: {
          filter: buildFilter(),
          limit,
          offset: (pageNumber - 1) * limit,
          order: [{ created_at: "desc" }],
        },
      });
      rows = result.data?.billing_invoices ?? [];
      total = result.data?.total?.aggregate?.count ?? 0;
      amount = result.data?.amount?.aggregate?.sum?.total ?? 0;
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load invoices.";
    } finally {
      loading = false;
    }
  }

  function handleSearchInput() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      pageNumber = 1;
      load();
    }, 400);
  }

  function handleLimitChange(e: Event) {
    limit = Number((e.currentTarget as HTMLSelectElement).value) || DEFAULT_PAGE_SIZE;
    pageNumber = 1;
    load();
  }

  function goToPage(p: number) {
    pageNumber = p;
    load();
  }

  $effect(() => {
    void search;
    void pageNumber;
    void limit;
    load();
  });

  function openPreview(invoice: BillingInvoice) {
    selectedInvoice = invoice;
    isPreviewOpen = true;
  }
</script>

<div class="flex flex-col gap-5">
  <!-- Toolbar -->
  <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div class="relative w-full md:w-80">
      <Icon
        iconName="icon/search"
        size={18}
        class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <input
        type="text"
        placeholder={companyId ? "Search invoice or transaction number" : "Search invoice number or company"}
        bind:value={search}
        oninput={handleSearchInput}
        class="w-full bg-background border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-info/20"
      />
    </div>

    <div class="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-2">
      <Icon iconName="icon/dollar-sign" size={16} class="text-info" />
      <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invoiced</span>
      <span class="text-sm font-bold text-foreground">{formatCurrency(amount)}</span>
    </div>
  </div>

  <!-- Table -->
  <div class="border border-border rounded-2xl overflow-hidden bg-card">
    <div class="overflow-x-auto">
      <table class={`w-full text-sm ${companyId ? "min-w-[760px]" : "min-w-[900px]"}`}>
        <thead class="bg-muted/80 text-muted-foreground font-bold uppercase text-[11px] tracking-wider">
          <tr>
            <th class="px-5 py-4 text-left">Invoice #</th>
            {#if !companyId}
              <th class="px-5 py-4 text-left">Company</th>
            {/if}
            <th class="px-5 py-4 text-left">Plan</th>
            <th class="px-5 py-4 text-left">Period</th>
            <th class="px-5 py-4 text-left">Total</th>
            <th class="px-5 py-4 text-left">Issued</th>
            <th class="px-5 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          {#if loading && rows.length === 0}
            {#each Array(5) as _}
              <tr class="animate-pulse">
                <td class="px-5 py-4"><div class="w-32 h-3 rounded bg-muted"></div></td>
                {#if !companyId}
                  <td class="px-5 py-4"><div class="w-40 h-3 rounded bg-muted"></div></td>
                {/if}
                <td class="px-5 py-4"><div class="w-32 h-3 rounded bg-muted"></div></td>
                <td class="px-5 py-4"><div class="w-36 h-3 rounded bg-muted"></div></td>
                <td class="px-5 py-4"><div class="w-24 h-3 rounded bg-muted"></div></td>
                <td class="px-5 py-4"><div class="w-24 h-3 rounded bg-muted"></div></td>
                <td class="px-5 py-4"><div class="w-16 h-3 ml-auto rounded bg-muted"></div></td>
              </tr>
            {/each}
          {:else if rows.length === 0}
            <tr>
              <td colspan={companyId ? 6 : 7} class="px-5 py-16 text-center">
                <Icon iconName="icon/file-text" size={24} class="text-muted-foreground inline mr-2" />
                <span class="text-muted-foreground">
                  No invoices yet. Invoices are generated automatically when a payment is approved.
                </span>
              </td>
            </tr>
          {:else}
            {#each rows as invoice (invoice.id)}
              {@const plan = invoice.pricing_plan_frequency_price}
              <tr class="hover:bg-muted/50 transition-colors">
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                      <Icon iconName="icon/file-text" size={16} class="text-purple-600 dark:text-purple-400" />
                    </div>
                    <span class="font-bold text-foreground">{invoice.invoice_number}</span>
                  </div>
                </td>
                {#if !companyId}
                  <td class="px-5 py-4">
                    <p class="font-semibold text-foreground truncate">{invoice.company?.name ?? "—"}</p>
                    <p class="text-[11px] text-muted-foreground">
                      TIN {invoice.tin_number ?? invoice.company?.tin_number ?? "—"}
                    </p>
                  </td>
                {/if}
                <td class="px-5 py-4">
                  <p class="font-semibold text-foreground truncate">{plan?.pricing_plan?.name ?? "—"}</p>
                  <p class="text-[11px] text-muted-foreground">{frequencyLabel(plan?.frequency)}</p>
                </td>
                <td class="px-5 py-4 text-muted-foreground">
                  {formatDate(invoice.start_date)} — {formatDate(invoice.end_date)}
                </td>
                <td class="px-5 py-4 font-bold text-foreground">{formatCurrency(invoice.total)}</td>
                <td class="px-5 py-4 text-muted-foreground">{formatDate(invoice.created_at)}</td>
                <td class="px-5 py-4">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      title="View invoice"
                      onclick={() => openPreview(invoice)}
                      class="p-1.5 rounded-md text-muted-foreground hover:text-info hover:bg-info/10 transition-colors"
                    >
                      <Icon iconName="icon/eye" size={16} />
                    </button>
                    <button
                      type="button"
                      title="Download PDF"
                      onclick={() => openPreview(invoice)}
                      class="p-1.5 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      <Icon iconName="icon/download" size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    <div
      class="p-4 border-t border-border flex items-center justify-between text-muted-foreground text-sm flex-wrap gap-3"
    >
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
        <span>
          {total === 0 ? "0 entries" : `Showing ${pageStart}–${pageEnd} of ${total} entries`}
        </span>
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

  {#if error}
    <div class="flex items-center gap-2 text-sm text-rose-500">
      <Icon iconName="icon/alert-circle" size={16} />
      <span>{error}</span>
    </div>
  {/if}
</div>

<InvoicePreviewModal bind:isOpen={isPreviewOpen} invoice={selectedInvoice} onChanged={onChanged} />
