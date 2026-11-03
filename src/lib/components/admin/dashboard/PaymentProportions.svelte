<script lang="ts">
  import { getAdminClient } from "$graphql/client";
  import PAYMENT_PROPORTIONS from "$graphql/queries/dashboard/payment_proportions.gql";
  import { frequencyLabel } from "$lib/billing/index.js";
  import ProportionChart, { type ProportionRow } from "./ProportionChart.svelte";

  type Result = { per_pricing_plan: ProportionRow[]; per_frequency: ProportionRow[] };

  let data = $state<Result | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  async function load() {
    loading = true;
    error = null;
    try {
      const result = await getAdminClient().query<Result>({ query: PAYMENT_PROPORTIONS });
      data = result.data ?? null;
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load payment breakdown.";
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    load();
  });
</script>

<div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
  <ProportionChart title="Payments by Pricing Plan" rows={data?.per_pricing_plan ?? []} {loading} {error} />
  <ProportionChart
    title="Payments by Frequency"
    rows={data?.per_frequency ?? []}
    labelFor={frequencyLabel}
    {loading}
    {error}
  />
</div>
