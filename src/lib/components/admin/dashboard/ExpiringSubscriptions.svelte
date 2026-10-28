<script lang="ts">
  import { goto } from "$app/navigation";
  import Icon from "$lib/components/ui/Icon/index.js";
  import { Dropdown } from "$lib/components/ui/dropdown/index.js";
  import { getAdminClient } from "$graphql/client";
  import EXPIRING_SUBSCRIPTIONS from "$graphql/queries/dashboard/expiring_subscriptions.gql";
  import { formatCurrency, formatDate, formatNumber, frequencyLabel } from "$lib/billing/index.js";
  import { parseISODate, toISODate } from "./period.js";

  type Subscription = {
    id: string;
    start_date: string;
    end_date: string;
    company: { id: string; name: string } | null;
    pricing_plan_frequency_price: {
      frequency: string;
      price: number;
      pricing_plan: { name: string } | null;
    } | null;
  };

  const WINDOW_OPTIONS = [
    { value: "7", label: "Next 7 days" },
    { value: "30", label: "Next 30 days" },
    { value: "60", label: "Next 60 days" },
    { value: "90", label: "Next 90 days" },
  ];

  const DAY_MS = 24 * 60 * 60 * 1000;

  let windowDays = $state("30");
  let rows = $state<Subscription[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let requestId = 0;

  async function load(until: string) {
    const id = ++requestId;
    loading = true;
    error = null;
    try {
      const result = await getAdminClient().query<{ billing_subscriptions: Subscription[] }>({
        query: EXPIRING_SUBSCRIPTIONS,
        variables: { until },
      });
      if (id !== requestId) return;
      rows = result.data?.billing_subscriptions ?? [];
    } catch (e) {
      if (id !== requestId) return;
      error = e instanceof Error ? e.message : "Failed to load expiring subscriptions.";
    } finally {
      if (id === requestId) loading = false;
    }
  }

  function today(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  $effect(() => {
    const until = today();
    until.setDate(until.getDate() + Number(windowDays));
    load(toISODate(until));
  });

  function daysLeft(endDate: string): number {
    return Math.round((parseISODate(endDate).getTime() - today().getTime()) / DAY_MS);
  }

  // Status ships with an icon + label, never color alone.
  function urgency(days: number) {
    if (days < 0)
      return {
        label: `Expired ${formatNumber(-days)}d ago`,
        icon: "icon/alert-circle",
        class: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
      };
    if (days <= 7)
      return {
        label: days === 0 ? "Expires today" : `${formatNumber(days)}d left`,
        icon: "icon/alert-triangle",
        class: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      };
    return {
      label: `${formatNumber(days)}d left`,
      icon: "icon/clock",
      class: "bg-muted text-muted-foreground",
    };
  }

  const expiredCount = $derived(rows.filter((r) => daysLeft(r.end_date) < 0).length);
  const renewalValue = $derived(
    rows.reduce((acc, r) => acc + Number(r.pricing_plan_frequency_price?.price ?? 0), 0)
  );
</script>

<div class="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
  <div class="px-6 py-4 border-b border-border flex flex-wrap justify-between items-start gap-3">
    <div>
      <h3 class="text-base font-bold text-foreground">Expiring Subscriptions</h3>
      <p class="text-xs text-muted-foreground mt-0.5">
        {#if loading && rows.length === 0}
          Loading…
        {:else}
          {formatNumber(rows.length)} to renew · {formatCurrency(renewalValue)} in plan value
          {#if expiredCount > 0}
            · <span class="text-rose-600 dark:text-rose-400 font-medium">{formatNumber(expiredCount)} already expired</span>
          {/if}
        {/if}
      </p>
    </div>
    <Dropdown
      options={WINDOW_OPTIONS}
      value={windowDays}
      onchange={(v) => (windowDays = v)}
      containerClass="w-36"
    />
  </div>

  {#if error}
    <p class="px-6 py-4 text-xs text-rose-500">{error}</p>
  {:else if loading && rows.length === 0}
    <div class="p-6 space-y-3">
      {#each [0, 1, 2] as i (i)}
        <div class="h-10 rounded bg-muted animate-pulse"></div>
      {/each}
    </div>
  {:else if rows.length === 0}
    <div class="px-6 py-10 flex flex-col items-center gap-2 text-center">
      <div class="bg-green-100 dark:bg-green-900/40 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-lg">
        <Icon iconName="icon/check-circle" size={20} />
      </div>
      <p class="text-sm text-muted-foreground">No subscriptions expire in this window.</p>
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
            <th class="text-left font-medium px-6 py-3">Company</th>
            <th class="text-left font-medium px-3 py-3">Plan</th>
            <th class="text-right font-medium px-3 py-3">Price</th>
            <th class="text-left font-medium px-3 py-3">Ends</th>
            <th class="text-left font-medium px-6 py-3">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border" class:opacity-60={loading}>
          {#each rows as sub (sub.id)}
            {@const status = urgency(daysLeft(sub.end_date))}
            {@const price = sub.pricing_plan_frequency_price}
            <tr
              class="hover:bg-muted/50 transition-colors cursor-pointer"
              onclick={() => sub.company && goto(`/admin/companies/${sub.company.id}`)}
            >
              <td class="px-6 py-3 font-medium text-foreground">{sub.company?.name ?? "—"}</td>
              <td class="px-3 py-3 text-foreground">
                {price?.pricing_plan?.name ?? "—"}
                <span class="text-xs text-muted-foreground">· {frequencyLabel(price?.frequency)}</span>
              </td>
              <td class="px-3 py-3 text-right tabular-nums text-foreground">{formatCurrency(price?.price)}</td>
              <td class="px-3 py-3 text-muted-foreground whitespace-nowrap">{formatDate(sub.end_date)}</td>
              <td class="px-6 py-3">
                <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap {status.class}">
                  <Icon iconName={status.icon as any} size={12} />
                  {status.label}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
