<script lang="ts">
  import type { ApexOptions } from "apexcharts";
  import { getAdminClient } from "$graphql/client";
  import COMPANY_REGISTRATION_TREND from "$graphql/queries/dashboard/company_registration_trend.gql";
  import { formatNumber } from "$lib/billing/index.js";
  import ApexChart from "./ApexChart.svelte";
  import TrendFilters from "./TrendFilters.svelte";
  import { baseChartOptions, chartMode, seriesColors } from "./chart-theme.svelte.js";
  import { defaultStartDate, formatPeriod, toISODate, type GroupPeriod } from "./period.js";

  type Row = { period_date: string; total_companies: number };
  type Result = { admin_company_registration_trend_report: Row[] };

  let group = $state<GroupPeriod>("per_month");
  let startDate = $state(defaultStartDate());
  let endDate = $state(new Date());

  let rows = $state<Row[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let requestId = 0;

  async function load(variables: { start_date: string; end_date: string; group_period: GroupPeriod }) {
    const id = ++requestId;
    loading = true;
    error = null;
    try {
      const result = await getAdminClient().query<Result>({ query: COMPANY_REGISTRATION_TREND, variables });
      if (id !== requestId) return;
      rows = result.data?.admin_company_registration_trend_report ?? [];
    } catch (e) {
      if (id !== requestId) return;
      error = e instanceof Error ? e.message : "Failed to load registration trend.";
    } finally {
      if (id === requestId) loading = false;
    }
  }

  $effect(() => {
    load({ start_date: toISODate(startDate), end_date: toISODate(endDate), group_period: group });
  });

  const total = $derived(rows.reduce((acc, r) => acc + Number(r.total_companies), 0));

  const options = $derived.by((): ApexOptions => {
    const base = baseChartOptions(chartMode.dark);
    return {
      ...base,
      chart: { ...base.chart, type: "bar", height: 280 },
      colors: [seriesColors(chartMode.dark)[0]],
      series: [{ name: "Registrations", data: rows.map((r) => Number(r.total_companies)) }],
      plotOptions: {
        bar: { borderRadius: 4, borderRadiusApplication: "end", columnWidth: "60%" },
      },
      xaxis: {
        categories: rows.map((r) => formatPeriod(r.period_date, group)),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { rotate: -45, hideOverlappingLabels: true },
        tickAmount: rows.length > 16 ? 12 : undefined,
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: { formatter: (v) => formatNumber(Math.round(v)) },
      },
      tooltip: {
        ...base.tooltip,
        y: { formatter: (v) => `${formatNumber(v)} ${v === 1 ? "company" : "companies"}` },
      },
    };
  });
</script>

<div class="bg-card rounded-xl border border-border shadow-sm p-5 flex flex-col gap-4">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h3 class="text-base font-bold text-foreground">Company Registrations</h3>
      <p class="text-xs text-muted-foreground mt-0.5">
        {formatNumber(total)} new {total === 1 ? "company" : "companies"} in range
      </p>
    </div>
    <TrendFilters bind:group bind:startDate bind:endDate />
  </div>

  <div class="relative min-h-[280px]">
    {#if error}
      <p class="text-xs text-rose-500">{error}</p>
    {:else if loading && rows.length === 0}
      <div class="h-[280px] rounded-lg bg-muted animate-pulse"></div>
    {:else}
      <ApexChart {options} class={loading ? "opacity-60 transition-opacity" : "transition-opacity"} />
    {/if}
  </div>
</div>
