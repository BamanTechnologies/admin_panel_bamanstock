<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";
  import { useAdminProfile } from "$lib/stores/profile.svelte.js";
  import { getAdminClient } from "$graphql/client";
  import DASHBOARD_STATS from "$graphql/queries/dashboard/stats.gql";

  type DashboardStats = {
    total_investors: { aggregate: { count: number } };
    total_companies: { aggregate: { count: number } };
    total_customers: { aggregate: { count: number } };
    total_merchants: { aggregate: { count: number } };
  };

  type StatKey = keyof DashboardStats;

  const profile = useAdminProfile();

  const statDefs: { label: string; key: StatKey; icon: string; color: string; bg: string }[] = [
    {
      label: "Total Investors",
      key: "total_investors",
      icon: "icon/users",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-900/40",
    },
    {
      label: "Total Companies",
      key: "total_companies",
      icon: "icon/building",
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-100 dark:bg-cyan-900/40",
    },
    {
      label: "Total Customers",
      key: "total_customers",
      icon: "icon/user",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-green-100 dark:bg-green-900/40",
    },
    {
      label: "Total Merchants",
      key: "total_merchants",
      icon: "icon/store",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/40",
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

  function statValue(def: (typeof statDefs)[number]): string {
    if (!statsData) return "—";
    const count = statsData[def.key]?.aggregate?.count ?? 0;
    return new Intl.NumberFormat("en-US").format(count);
  }

  const activities = [
    { id: "1", title: "Merchant Suspended", desc: "Merchant ID #19302 violated TOS", time: "1m", icon: "icon/user-minus", iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600 dark:text-blue-400" },
    { id: "2", title: "Subscription Upgraded", desc: "Sarah J. switched to Pro Plan", time: "1m", icon: "icon/trending-up", iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600 dark:text-blue-400" },
    { id: "3", title: "New User Registration", desc: "Mike Ross joined as Merchant", time: "1m", icon: "icon/user-plus", iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600 dark:text-blue-400" },
    { id: "4", title: "Invoice Generated", desc: "Invoice #NV0293 sent to a client", time: "1m", icon: "icon/file-text", iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600 dark:text-blue-400" }
  ];
</script>

<svelte:head>
  <title>Dashboard — BamanStock</title>
</svelte:head>

<div class="space-y-6 p-2">
  <div class="flex items-center justify-between mb-8">
    <h2 class="text-2xl font-semibold text-foreground">
      Welcome, {profile.name || 'Administrator'}
    </h2>
    <div class="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
      <Icon iconName="icon/calendar" size={14} />
      <span>01 Jan 2024 - 07 Jan 2024</span>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {#each statDefs as stat}
      <div class="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between min-h-[140px]">
        <div class="flex justify-between items-start">
          <div>
            {#if statsLoading}
              <div class="w-20 h-7 rounded bg-muted animate-pulse"></div>
            {:else}
              <p class="text-xl font-bold text-foreground leading-tight">{statValue(stat)}</p>
            {/if}
            <p class="text-[13px] text-muted-foreground mt-1 font-normal">{stat.label}</p>
          </div>
          <div class="{stat.bg} {stat.color} p-2.5 rounded-lg">
            <Icon iconName={stat.icon as any} size={20} />
          </div>
        </div>
        {#if statsError}
          <p class="text-xs text-rose-500">{statsError}</p>
        {/if}
      </div>
    {/each}
  </div>

  <div class="bg-card rounded-xl border border-border shadow-sm overflow-hidden mt-8">
    <div class="px-6 py-4 border-b border-border flex justify-between items-center">
      <h3 class="text-base font-bold text-foreground">Recent Activity</h3>
      <button class="text-xs font-bold text-info hover:text-blue-600">View All</button>
    </div>

    <div class="divide-y divide-slate-50">
      {#each activities as activity}
        <div class="px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
          <div class="flex items-center gap-4">
            <div class="{activity.iconBg} {activity.iconColor} w-10 h-10 rounded-lg flex items-center justify-center">
              <Icon iconName={activity.icon as any} size={18} />
            </div>
            <div>
              <h4 class="text-sm font-bold text-foreground leading-tight">{activity.title}</h4>
              <p class="text-xs text-muted-foreground mt-0.5">{activity.desc}</p>
            </div>
          </div>
          <span class="text-xs font-medium text-blue-400">{activity.time}</span>
        </div>
      {/each}
    </div>
  </div>
</div>