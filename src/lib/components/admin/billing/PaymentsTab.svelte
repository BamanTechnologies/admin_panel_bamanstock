<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";
  import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";
  import AddPaymentModal from "$lib/components/admin/billing/AddPaymentModal.svelte";
  import { getAdminClient } from "$graphql/client";
  import PAYMENTS from "$graphql/queries/billing/payments.gql";
  import PAYMENT_STATUSES from "$graphql/queries/billing/payment_status.gql";
  import UPDATE_PAYMENT from "$graphql/mutation/billing/update_payment.gql";
  import DELETE_PAYMENT from "$graphql/mutation/billing/delete_payments.gql";
  import { authStore } from "$lib/stores/auth.svelte.js";
  import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, buildPageList } from "$lib/pagination";
  import {
    billingErrorMessage,
    canDeletePayment,
    formatCurrency,
    formatDate,
    frequencyLabel,
    paymentStatusClasses,
    paymentStatusLabel,
    type BillingPayment,
  } from "$lib/billing/index.js";

  let { onChanged = () => {} }: { onChanged?: () => void } = $props();

  type ApprovalFilter = "all" | "verified" | "unverified";

  let rows = $state<BillingPayment[]>([]);
  let statuses = $state<{ value: string }[]>([]);
  let total = $state(0);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let search = $state("");
  let statusFilter = $state("");
  let approval = $state<ApprovalFilter>("all");
  let pageNumber = $state(1);
  let limit = $state<number>(DEFAULT_PAGE_SIZE);

  let isAddOpen = $state(false);
  let confirmOpen = $state(false);
  let pendingAction = $state<"approve" | "reject" | "delete">("approve");
  let pendingPayment = $state<BillingPayment | null>(null);
  let confirmLoading = $state(false);
  let confirmError = $state<string | null>(null);

  let searchDebounce: ReturnType<typeof setTimeout>;

  const totalPages = $derived(Math.max(1, Math.ceil(total / limit)));
  const pageStart = $derived(total === 0 ? 0 : (pageNumber - 1) * limit + 1);
  const pageEnd = $derived(Math.min(pageNumber * limit, total));

  function buildFilter(): Record<string, unknown> {
    const clauses: Record<string, unknown>[] = [];
    if (search.trim()) {
      const q = search.trim();
      clauses.push({
        _or: [
          { company: { name: { _ilike: `%${q}%` } } },
          { transaction_id: { _ilike: `%${q}%` } },
          { reference_id: { _ilike: `%${q}%` } },
          {
            pricing_plan_frequency_price: {
              pricing_plan: { name: { _ilike: `%${q}%` } },
            },
          },
        ],
      });
    }
    if (statusFilter) clauses.push({ payment_status: { _eq: statusFilter } });
    if (approval === "verified") clauses.push({ is_verified: { _eq: true } });
    if (approval === "unverified") clauses.push({ is_verified: { _eq: false } });

    return clauses.length ? { _and: clauses } : {};
  }

  async function load() {
    loading = true;
    error = null;
    try {
      const result = await getAdminClient().query<{
        billing_payments: BillingPayment[];
        total: { aggregate: { count: number } };
      }>({
        query: PAYMENTS,
        variables: {
          filter: buildFilter(),
          limit,
          offset: (pageNumber - 1) * limit,
          order: [{ created_at: "desc" }],
        },
      });
      rows = result.data?.billing_payments ?? [];
      total = result.data?.total?.aggregate?.count ?? 0;
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load payments.";
    } finally {
      loading = false;
    }
  }

  async function loadStatuses() {
    try {
      const result = await getAdminClient().query<{ billing_payment_status: { value: string }[] }>({
        query: PAYMENT_STATUSES,
        variables: { limit: 50, offset: 0 },
      });
      statuses = result.data?.billing_payment_status ?? [];
    } catch {
      statuses = [];
    }
  }

  function handleSearchInput() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      pageNumber = 1;
      load();
    }, 400);
  }

  function handleStatusChange(e: Event) {
    statusFilter = (e.currentTarget as HTMLSelectElement).value;
    pageNumber = 1;
    load();
  }

  function handleApprovalChange(e: Event) {
    approval = (e.currentTarget as HTMLSelectElement).value as ApprovalFilter;
    pageNumber = 1;
    load();
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
    void statusFilter;
    void approval;
    void pageNumber;
    void limit;
    load();
  });

  $effect(() => {
    loadStatuses();
  });

  function askConfirm(payment: BillingPayment, action: "approve" | "reject" | "delete") {
    pendingPayment = payment;
    pendingAction = action;
    confirmError = null;
    confirmOpen = true;
  }

  async function confirmAction() {
    if (!pendingPayment) return;
    confirmLoading = true;
    confirmError = null;
    const client = getAdminClient();
    try {
      if (pendingAction === "delete") {
        await client.mutate({
          mutation: DELETE_PAYMENT,
          variables: { id: pendingPayment.id },
        });
      } else {
        const approve = pendingAction === "approve";
        await client.mutate({
          mutation: UPDATE_PAYMENT,
          variables: {
            id: pendingPayment.id,
            set: {
              is_verified: approve,
              payment_status: approve ? "payed" : "rejected",
              verified_by: approve ? (authStore.user?.id ?? null) : null,
            },
          },
        });
      }
      confirmOpen = false;
      await load();
      onChanged();
    } catch (e) {
      confirmError = billingErrorMessage(e, `Failed to ${pendingAction} the payment.`);
    } finally {
      confirmLoading = false;
    }
  }

  const confirmTitle = $derived(
    pendingAction === "approve"
      ? "Approve payment"
      : pendingAction === "reject"
        ? "Reject payment"
        : "Delete payment"
  );

  const confirmMessage = $derived(
    pendingAction === "approve"
      ? `Approve the payment of <strong>${formatCurrency(pendingPayment?.total ?? 0)}</strong> from <strong>${pendingPayment?.company?.name ?? "this company"}</strong>? An invoice will be generated automatically.`
      : pendingAction === "reject"
        ? `Reject the payment of <strong>${formatCurrency(pendingPayment?.total ?? 0)}</strong> from <strong>${pendingPayment?.company?.name ?? "this company"}</strong>?`
        : `Are you sure you want to delete this payment record? This action cannot be undone.`
  );

  const confirmButtonClass = $derived(
    pendingAction === "approve"
      ? "bg-emerald-600 text-white hover:bg-emerald-700 min-w-[100px]"
      : pendingAction === "reject"
        ? "bg-amber-600 text-white hover:bg-amber-700 min-w-[100px]"
        : "bg-red-600 text-white hover:bg-red-700 min-w-[100px]"
  );
</script>

<div class="flex flex-col gap-5">
  <!-- Toolbar -->
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="relative w-full md:w-80">
        <Icon
          iconName="icon/search"
          size={18}
          class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search company, transaction or plan"
          bind:value={search}
          oninput={handleSearchInput}
          class="w-full bg-background border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-info/20"
        />
      </div>

      <button
        type="button"
        onclick={() => (isAddOpen = true)}
        class="flex items-center justify-center gap-2 bg-[#4D8DEE] text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm hover:opacity-90 shrink-0"
      >
        <Icon iconName="icon/plus" size={16} /> Add Payment
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</span>
        <select
          value={statusFilter}
          onchange={handleStatusChange}
          class="h-9 px-3 border border-border rounded-lg bg-background text-sm text-foreground focus:outline-none focus:border-border"
        >
          <option value="">All statuses</option>
          {#each statuses as s}
            <option value={s.value}>{paymentStatusLabel(s.value)}</option>
          {/each}
        </select>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Approval</span>
        <select
          value={approval}
          onchange={handleApprovalChange}
          class="h-9 px-3 border border-border rounded-lg bg-background text-sm text-foreground focus:outline-none focus:border-border"
        >
          <option value="all">All</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      {#if approval !== "all" || statusFilter || search.trim()}
        <button
          type="button"
          onclick={() => {
            approval = "all";
            statusFilter = "";
            search = "";
            pageNumber = 1;
            load();
          }}
          class="text-xs font-semibold text-info hover:underline"
        >
          Clear filters
        </button>
      {/if}
    </div>
  </div>

  <!-- Table -->
  <div class="border border-border rounded-2xl overflow-hidden bg-card">
    <div class="overflow-x-auto">
      <table class="w-full text-sm min-w-[1000px]">
        <thead class="bg-muted/80 text-muted-foreground font-bold uppercase text-[11px] tracking-wider">
          <tr>
            <th class="px-5 py-4 text-left">Company</th>
            <th class="px-5 py-4 text-left">Plan</th>
            <th class="px-5 py-4 text-left">Amount</th>
            <th class="px-5 py-4 text-left">Method</th>
            <th class="px-5 py-4 text-left">Payment Date</th>
            <th class="px-5 py-4 text-left">Status</th>
            <th class="px-5 py-4 text-left">Approval</th>
            <th class="px-5 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          {#if loading && rows.length === 0}
            {#each Array(5) as _}
              <tr class="animate-pulse">
                <td class="px-5 py-4"><div class="w-40 h-3 rounded bg-muted"></div></td>
                <td class="px-5 py-4"><div class="w-32 h-3 rounded bg-muted"></div></td>
                <td class="px-5 py-4"><div class="w-24 h-3 rounded bg-muted"></div></td>
                <td class="px-5 py-4"><div class="w-20 h-3 rounded bg-muted"></div></td>
                <td class="px-5 py-4"><div class="w-24 h-3 rounded bg-muted"></div></td>
                <td class="px-5 py-4"><div class="w-20 h-3 rounded bg-muted"></div></td>
                <td class="px-5 py-4"><div class="w-20 h-3 rounded bg-muted"></div></td>
                <td class="px-5 py-4"><div class="w-16 h-3 ml-auto rounded bg-muted"></div></td>
              </tr>
            {/each}
          {:else if rows.length === 0}
            <tr>
              <td colspan="8" class="px-5 py-16 text-center">
                <Icon iconName="icon/credit-card" size={24} class="text-muted-foreground inline mr-2" />
                <span class="text-muted-foreground">No payments found.</span>
              </td>
            </tr>
          {:else}
            {#each rows as p (p.id)}
              {@const plan = p.pricing_plan_frequency_price}
              <tr class="hover:bg-muted/50 transition-colors">
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
                      <Icon iconName="icon/building" size={16} class="text-info" />
                    </div>
                    <div class="min-w-0">
                      <p class="font-bold text-foreground truncate">{p.company?.name ?? "—"}</p>
                      {#if p.company?.tin_number}
                        <p class="text-[11px] text-muted-foreground">TIN {p.company.tin_number}</p>
                      {/if}
                    </div>
                  </div>
                </td>
                <td class="px-5 py-4">
                  <p class="font-semibold text-foreground truncate">
                    {plan?.pricing_plan?.name ?? "—"}
                  </p>
                  <p class="text-[11px] text-muted-foreground">
                    {plan ? frequencyLabel(plan.frequency) : ""}
                    {p.transaction_id ? ` · ${p.transaction_id}` : ""}
                  </p>
                </td>
                <td class="px-5 py-4">
                  <p class="font-bold text-foreground">{formatCurrency(p.total)}</p>
                  <p class="text-[11px] text-muted-foreground">
                    Subtotal {formatCurrency(p.subtotal)}
                  </p>
                </td>
                <td class="px-5 py-4 text-muted-foreground capitalize">
                  {(p.payment_method ?? "—").replace(/_/g, " ")}
                </td>
                <td class="px-5 py-4 text-muted-foreground">{formatDate(p.payment_date)}</td>
                <td class="px-5 py-4">
                  <span
                    class="px-2.5 py-1 rounded-full text-[10px] font-bold {paymentStatusClasses(p.payment_status)}"
                  >
                    {paymentStatusLabel(p.payment_status)}
                  </span>
                </td>
                <td class="px-5 py-4">
                  {#if p.is_verified}
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      Verified
                    </span>
                    {#if p.verifier}
                      <p class="text-[11px] text-muted-foreground mt-1 truncate">
                        {[p.verifier.first_name, p.verifier.last_name]
                          .filter(Boolean)
                          .join(" ") || p.verifier.email}
                      </p>
                    {/if}
                  {:else}
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      Pending
                    </span>
                  {/if}
                </td>
                <td class="px-5 py-4">
                  <div class="flex items-center justify-end gap-1">
                    {#if !p.is_verified}
                      <button
                        type="button"
                        title="Approve payment"
                        onclick={() => askConfirm(p, "approve")}
                        class="p-1.5 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                      >
                        <Icon iconName="icon/check-circle" size={16} />
                      </button>
                      <button
                        type="button"
                        title="Reject payment"
                        onclick={() => askConfirm(p, "reject")}
                        class="p-1.5 rounded-md text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                      >
                        <Icon iconName="icon/x-circle" size={16} />
                      </button>
                    {:else}
                      <span
                        title="Approved payments are invoiced and kept for audit"
                        class="p-1.5 rounded-md text-muted-foreground/60 inline-flex"
                      >
                        <Icon iconName="icon/lock" size={16} />
                      </span>
                    {/if}
                    {#if canDeletePayment(p)}
                      <button
                        type="button"
                        title="Delete payment"
                        onclick={() => askConfirm(p, "delete")}
                        class="p-1.5 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Icon iconName="icon/trash" size={16} />
                      </button>
                    {/if}
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

<AddPaymentModal bind:isOpen={isAddOpen} onSuccess={() => { load(); onChanged(); }} />

<ConfirmModal
  bind:isOpen={confirmOpen}
  title={confirmTitle}
  icon={pendingAction === "approve" ? "icon/check-circle" : pendingAction === "reject" ? "icon/x-circle" : "icon/trash"}
  message={confirmMessage}
  error={confirmError}
  confirmText={pendingAction === "approve" ? "Approve" : pendingAction === "reject" ? "Reject" : "Delete"}
  loading={confirmLoading}
  confirmClass={confirmButtonClass}
  onConfirm={confirmAction}
/>
