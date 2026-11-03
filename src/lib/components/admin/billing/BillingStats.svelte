<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";
  import { getAdminClient } from "$graphql/client";
  import BILLING_STATS from "$graphql/queries/billing/stats.gql";
  import { formatCurrency, formatNumber } from "$lib/billing/index.js";

  type Stats = {
    total_plans: { aggregate: { count: number } };
    public_plans: { aggregate: { count: number } };
    total_payments: { aggregate: { count: number } };
    verified_payments: { aggregate: { count: number } };
    pending_payments: { aggregate: { count: number } };
    total_invoices: { aggregate: { count: number } };
    collected_amount: { aggregate: { sum: { total: number | null } } };
    outstanding_amount: { aggregate: { sum: { total: number | null } } };
    invoiced_amount: { aggregate: { sum: { total: number | null } } };
  };

  let { refreshKey = 0 }: { refreshKey?: number } = $props();

  let stats = $state<Stats | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  async function load() {
    loading = true;
    error = null;
    try {
      const result = await getAdminClient().query<Stats>({ query: BILLING_STATS });
      stats = result.data ?? null;
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load billing stats.";
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void refreshKey;
    load();
  });

  type CountKey =
    | "total_plans"
    | "public_plans"
    | "total_payments"
    | "verified_payments"
    | "pending_payments"
    | "total_invoices";
  type SumKey = "collected_amount" | "outstanding_amount" | "invoiced_amount";

  const count = (key: CountKey): number => {
    const entry = stats?.[key] as { aggregate?: { count?: number } } | undefined;
    return entry?.aggregate?.count ?? 0;
  };

  const sum = (key: SumKey): number => {
    const entry = stats?.[key] as { aggregate?: { sum?: { total?: number | null } } } | undefined;
    return entry?.aggregate?.sum?.total ?? 0;
  };
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
  <!-- Collected revenue -->
  <div class="bg-card border border-border rounded-2xl shadow-sm p-5 flex flex-col justify-between min-h-[132px]">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        {#if loading && !stats}
          <div class="w-28 h-7 rounded bg-muted animate-pulse"></div>
        {:else}
          <p class="text-xl font-bold text-foreground leading-tight truncate">
            {formatCurrency(sum("collected_amount"))}
          </p>
        {/if}
        <p class="text-[13px] text-muted-foreground mt-1">Collected Revenue</p>
      </div>
      <div class="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-lg shrink-0">
        <Icon iconName="icon/dollar-sign" size={20} />
      </div>
    </div>
    <p class="text-[11px] text-muted-foreground mt-3">
      {formatNumber(count("verified_payments"))} verified of {formatNumber(count("total_payments"))} payments
    </p>
  </div>

  <!-- Outstanding -->
  <div class="bg-card border border-border rounded-2xl shadow-sm p-5 flex flex-col justify-between min-h-[132px]">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        {#if loading && !stats}
          <div class="w-28 h-7 rounded bg-muted animate-pulse"></div>
        {:else}
          <p class="text-xl font-bold text-foreground leading-tight truncate">
            {formatCurrency(sum("outstanding_amount"))}
          </p>
        {/if}
        <p class="text-[13px] text-muted-foreground mt-1">Outstanding</p>
      </div>
      <div class="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 p-2.5 rounded-lg shrink-0">
        <Icon iconName="icon/clock" size={20} />
      </div>
    </div>
    <p class="text-[11px] text-muted-foreground mt-3">
      {formatNumber(count("pending_payments"))} payments awaiting approval
    </p>
  </div>

  <!-- Pricing plans -->
  <div class="bg-card border border-border rounded-2xl shadow-sm p-5 flex flex-col justify-between min-h-[132px]">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        {#if loading && !stats}
          <div class="w-16 h-7 rounded bg-muted animate-pulse"></div>
        {:else}
          <p class="text-xl font-bold text-foreground leading-tight">
            {formatNumber(count("total_plans"))}
          </p>
        {/if}
        <p class="text-[13px] text-muted-foreground mt-1">Pricing Plans</p>
      </div>
      <div class="bg-info/10 text-info p-2.5 rounded-lg shrink-0">
        <Icon iconName="icon/credit-card" size={20} />
      </div>
    </div>
    <p class="text-[11px] text-muted-foreground mt-3">
      {formatNumber(count("public_plans"))} public · {formatNumber(count("total_plans") - count("public_plans"))} private
    </p>
  </div>

  <!-- Invoices -->
  <div class="bg-card border border-border rounded-2xl shadow-sm p-5 flex flex-col justify-between min-h-[132px]">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        {#if loading && !stats}
          <div class="w-16 h-7 rounded bg-muted animate-pulse"></div>
        {:else}
          <p class="text-xl font-bold text-foreground leading-tight">
            {formatNumber(count("total_invoices"))}
          </p>
        {/if}
        <p class="text-[13px] text-muted-foreground mt-1">Invoices</p>
      </div>
      <div class="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 p-2.5 rounded-lg shrink-0">
        <Icon iconName="icon/file-text" size={20} />
      </div>
    </div>
    <p class="text-[11px] text-muted-foreground mt-3">
      {formatCurrency(sum("invoiced_amount"))} invoiced
    </p>
  </div>

  {#if error}
    <p class="sm:col-span-2 xl:col-span-4 text-xs text-rose-500">{error}</p>
  {/if}
</div>
