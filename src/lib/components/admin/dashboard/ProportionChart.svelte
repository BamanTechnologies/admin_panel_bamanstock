<script module lang="ts">
  export type ProportionRow = { label: string; total_payments: number; total_amount: number };
</script>

<script lang="ts">
  import type { ApexOptions } from "apexcharts";
  import { formatCurrency, formatNumber } from "$lib/billing/index.js";
  import ApexChart from "./ApexChart.svelte";
  import {
    MAX_CATEGORIES,
    baseChartOptions,
    chartMode,
    otherColor,
    seriesColors,
    surfaceColor,
  } from "./chart-theme.svelte.js";

  let {
    title,
    rows,
    loading = false,
    error = null,
    labelFor = (label: string) => label,
  }: {
    title: string;
    rows: ProportionRow[];
    loading?: boolean;
    error?: string | null;
    labelFor?: (label: string) => string;
  } = $props();

  type Slice = { label: string; count: number; amount: number; color: string };

  // Colors are assigned by position in the server order and never cycled;
  // anything past the last categorical slot is folded into "Other".
  const slices = $derived.by((): Slice[] => {
    const colors = seriesColors(chartMode.dark);
    const visible = rows.length > MAX_CATEGORIES ? rows.slice(0, MAX_CATEGORIES - 1) : rows;
    const result: Slice[] = visible.map((r, i) => ({
      label: labelFor(r.label),
      count: Number(r.total_payments),
      amount: Number(r.total_amount),
      color: colors[i],
    }));
    const rest = rows.slice(visible.length);
    if (rest.length) {
      result.push({
        label: "Other",
        count: rest.reduce((acc, r) => acc + Number(r.total_payments), 0),
        amount: rest.reduce((acc, r) => acc + Number(r.total_amount), 0),
        color: otherColor(chartMode.dark),
      });
    }
    return result;
  });

  const total = $derived(slices.reduce((acc, s) => acc + s.count, 0));

  const percent = (count: number) => (total ? `${((count / total) * 100).toFixed(1)}%` : "0%");

  const options = $derived.by((): ApexOptions => {
    const base = baseChartOptions(chartMode.dark);
    return {
      ...base,
      chart: { ...base.chart, type: "donut", height: 240 },
      series: slices.map((s) => s.count),
      labels: slices.map((s) => s.label),
      colors: slices.map((s) => s.color),
      // Surface-colored stroke keeps a visible gap between adjacent slices.
      stroke: { width: 2, colors: [surfaceColor(chartMode.dark)] },
      plotOptions: {
        pie: {
          donut: {
            size: "68%",
            labels: {
              show: true,
              value: { formatter: (v) => formatNumber(v) },
              total: {
                show: true,
                label: "Payments",
                formatter: () => formatNumber(total),
              },
            },
          },
        },
      },
      tooltip: {
        ...base.tooltip,
        y: {
          formatter: (v, opts) =>
            `${formatNumber(v)} (${percent(Number(v))}) · ${formatCurrency(slices[opts?.seriesIndex ?? -1]?.amount)}`,
        },
      },
    };
  });
</script>

<div class="bg-card rounded-xl border border-border shadow-sm p-5 flex flex-col gap-4">
  <div>
    <h3 class="text-base font-bold text-foreground">{title}</h3>
    <p class="text-xs text-muted-foreground mt-0.5">Share of paid subscription payments</p>
  </div>

  {#if error}
    <p class="text-xs text-rose-500">{error}</p>
  {:else if loading}
    <div class="h-[240px] rounded-lg bg-muted animate-pulse"></div>
  {:else if total === 0}
    <div class="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
      No paid payments yet.
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
      <ApexChart {options} />
      <table class="w-full text-sm">
        <thead>
          <tr class="text-[11px] uppercase tracking-wide text-muted-foreground">
            <th class="text-left font-medium pb-2">Name</th>
            <th class="text-right font-medium pb-2">Payments</th>
            <th class="text-right font-medium pb-2">Share</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          {#each slices as slice (slice.label)}
            <tr>
              <td class="py-2 pr-2">
                <span class="flex items-center gap-2 min-w-0">
                  <span class="size-2.5 rounded-full shrink-0" style:background-color={slice.color}></span>
                  <span class="truncate text-foreground">{slice.label}</span>
                </span>
              </td>
              <td class="py-2 text-right tabular-nums text-foreground">{formatNumber(slice.count)}</td>
              <td class="py-2 text-right tabular-nums text-muted-foreground">{percent(slice.count)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
