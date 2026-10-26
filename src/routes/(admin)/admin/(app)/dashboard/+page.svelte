<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";
  import { useAdminProfile } from "$lib/stores/profile.svelte.js";
  import { getAdminClient } from "$graphql/client";
  import DASHBOARD_STATS from "$graphql/queries/dashboard/stats.gql";
  import { formatCurrency, formatNumber } from "$lib/billing/index.js";
  import CompanyRegistrationTrend from "$lib/components/admin/dashboard/CompanyRegistrationTrend.svelte";
  import PaymentTrend from "$lib/components/admin/dashboard/PaymentTrend.svelte";
  import PaymentProportions from "$lib/components/admin/dashboard/PaymentProportions.svelte";
  import ExpiringSubscriptions from "$lib/components/admin/dashboard/ExpiringSubscriptions.svelte";

  type Aggregate = { aggregate: { count: number; sum?: { total: number | null } } };

  type DashboardStats = {
    total_companies: Aggregate;
    active_companies: Aggregate;
    total_revenue: Aggregate;
    pending_payments: Aggregate;
  };

  const profile = useAdminProfile();

  const count = (s: DashboardStats, key: keyof DashboardStats) => s[key]?.aggregate?.count ?? 0;
  const sum = (s: DashboardStats, key: keyof DashboardStats) => s[key]?.aggregate?.sum?.total ?? 0;
  const plural = (n: number, one: string, many: string) => `${formatNumber(n)} ${n === 1 ? one : many}`;

  const statDefs: {
    label: string;
    icon: string;
    color: string;
    bg: string;
    value: (s: DashboardStats) => string;
    hint: (s: DashboardStats) => string;
  }[] = [
    {
      label: "Total Companies",
      icon: "icon/building",
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-100 dark:bg-cyan-900/40",
      value: (s) => formatNumber(count(s, "total_companies")),
      hint: () => "Registered on the platform",
    },
    {
      label: "Total Revenue",
      icon: "icon/dollar-sign",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-green-100 dark:bg-green-900/40",
      value: (s) => formatCurrency(sum(s, "total_revenue")),
      hint: (s) => `From ${plural(count(s, "total_revenue"), "paid payment", "paid payments")}`,
    },
    {
      label: "Pending Payments",
      icon: "icon/clock",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/40",
      value: (s) => formatNumber(count(s, "pending_payments")),
      hint: (s) => `${formatCurrency(sum(s, "pending_payments"))} awaiting confirmation`,
    },
    {
      label: "Active Companies",
      icon: "icon/check-circle",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-900/40",
      value: (s) => formatNumber(count(s, "active_companies")),
      hint: (s) =>
        `With an active subscription · ${formatNumber(count(s, "total_companies") - count(s, "active_companies"))} without`,
    },
  ];

  let statsLoading = $state(true);
  let statsError = $state<string | null>(null);
  let statsData = $state<DashboardStats | null>(null);

  async function loadStats() {
    statsLoading = true;
    statsError = null;
    try {
      const result = await getAdminClient().query<DashboardStats>({ query: DASHBOARD_STATS });
      statsData = result.data ?? null;
    } catch (e) {
      statsError = e instanceof Error ? e.message : "Failed to load dashboard stats.";
    } finally {
      statsLoading = false;
    }
  }

  $effect(() => {
    loadStats();
  });
</script>

<svelte:head>
  <title>Dashboard — BamanStock</title>
</svelte:head>

<div class="space-y-6 p-2">
  <div class="flex items-center justify-between mb-8">
    <h2 class="text-2xl font-semibold text-foreground">
      Welcome, {profile.name || 'Administrator'}
    </h2>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {#each statDefs as stat}
      <div class="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between min-h-[140px]">
        <div class="flex justify-between items-start gap-3">
          <div class="min-w-0">
            {#if statsLoading}
              <div class="w-20 h-7 rounded bg-muted animate-pulse"></div>
            {:else}
              <p class="text-xl font-bold text-foreground leading-tight truncate">
                {statsData ? stat.value(statsData) : "—"}
              </p>
            {/if}
            <p class="text-[13px] text-muted-foreground mt-1 font-normal">{stat.label}</p>
          </div>
          <div class="{stat.bg} {stat.color} p-2.5 rounded-lg shrink-0">
            <Icon iconName={stat.icon as any} size={20} />
          </div>
        </div>
        {#if statsError}
          <p class="text-xs text-rose-500">{statsError}</p>
        {:else if statsData}
          <p class="text-[11px] text-muted-foreground mt-3">{stat.hint(statsData)}</p>
        {/if}
      </div>
    {/each}
  </div>

  <div class="grid grid-cols-1 2xl:grid-cols-2 gap-4">
    <CompanyRegistrationTrend />
    <PaymentTrend />
  </div>

  <PaymentProportions />

  <ExpiringSubscriptions />
</div>
