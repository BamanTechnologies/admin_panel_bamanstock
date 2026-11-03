<script lang="ts">
  import ApexCharts from "apexcharts";
  import type { ApexOptions } from "apexcharts";

  let { options, class: className }: { options: ApexOptions; class?: string } = $props();

  let el = $state<HTMLDivElement | undefined>(undefined);

  // Rebuild on every options change: Apex's in-place updateOptions is unreliable
  // when labels/series shape change (e.g. donut slices, regrouped periods).
  $effect(() => {
    if (!el) return;
    const chart = new ApexCharts(el, options);
    chart.render();
    return () => chart.destroy();
  });
</script>

<div bind:this={el} class={className}></div>
