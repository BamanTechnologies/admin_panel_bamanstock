<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";
  import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";
  import AddPricingPlanModal from "$lib/components/admin/billing/AddPricingPlanModal.svelte";
  import { getAdminClient } from "$graphql/client";
  import PRICING_PLANS from "$graphql/queries/billing/pricing_plans.gql";
  import FREQUENCIES from "$graphql/queries/billing/frequencies.gql";
  import TOGGLE_VISIBILITY from "$graphql/mutation/billing/toggle_pricing_plan_visibility.gql";
  import DELETE_PRICING_PLAN from "$graphql/mutation/billing/delete_pricing_plan.gql";
  import {
    FREQUENCY_LABELS,
    billingErrorMessage,
    formatCurrency,
    frequencyLabel,
    frequencySuffix,
    planTypeLabel,
    rulesToEntries,
    type PricingPlanPrice,
  } from "$lib/billing/index.js";

  let { onChanged = () => {} }: { onChanged?: () => void } = $props();

  type PlanInfo = {
    id: string;
    name: string;
    type: string | null;
    is_public: boolean;
    description: string | null;
  };

  let rows = $state<PricingPlanPrice[]>([]);
  let frequencies = $state<{ name: string; display_order: number }[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let search = $state("");
  let frequency = $state<string>("");

  let isFormOpen = $state(false);
  let editingPlan = $state<PlanInfo | null>(null);
  let togglingId = $state<string | null>(null);

  let confirmDeleteOpen = $state(false);
  let pendingPlan = $state<PlanInfo | null>(null);
  let confirmLoading = $state(false);
  let confirmError = $state<string | null>(null);

  let searchDebounce: ReturnType<typeof setTimeout>;

  const filterTabs = $derived([
    { value: "", label: "All cycles" },
    ...frequencies.map((f) => ({
      value: f.name,
      label: FREQUENCY_LABELS[f.name] ?? f.name,
    })),
  ]);

  function buildFilter(): Record<string, unknown> {
    const clauses: Record<string, unknown>[] = [];
    if (frequency) clauses.push({ frequency: { _eq: frequency } });
    if (search.trim()) {
      const q = search.trim();
      clauses.push({
        pricing_plan: { name: { _ilike: `%${q}%` } },
      });
    }
    return clauses.length ? { _and: clauses } : {};
  }

  async function load() {
    loading = true;
    error = null;
    try {
      const client = getAdminClient();
      const result = await client.query<{
        billing_pricing_plan_frequency_prices: PricingPlanPrice[];
      }>({
        query: PRICING_PLANS,
        variables: {
          filter: buildFilter(),
          limit: 200,
          offset: 0,
          order: [{ pricing_plan: { name: "asc" } }, { frequency: "asc" }],
        },
      });
      rows = result.data?.billing_pricing_plan_frequency_prices ?? [];
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load pricing plans.";
    } finally {
      loading = false;
    }
  }

  async function loadFrequencies() {
    try {
      const result = await getAdminClient().query<{
        billing_frequencies: { name: string; display_order: number }[];
      }>({
        query: FREQUENCIES,
        variables: { limit: 50, offset: 0 },
      });
      frequencies = result.data?.billing_frequencies ?? [];
    } catch {
      frequencies = [];
    }
  }

  function handleSearchInput() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(load, 400);
  }

  $effect(() => {
    void frequency;
    loadFrequencies();
  });

  $effect(() => {
    void search;
    void frequency;
    load();
  });

  async function toggleVisibility(row: PricingPlanPrice) {
    if (togglingId) return;
    togglingId = row.pricing_plan.id;
    try {
      await getAdminClient().mutate({
        mutation: TOGGLE_VISIBILITY,
        variables: {
          id: row.pricing_plan.id,
          isPublic: !row.pricing_plan.is_public,
        },
      });
      await load();
      onChanged();
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to update the plan visibility.";
    } finally {
      togglingId = null;
    }
  }

  function openAdd() {
    editingPlan = null;
    isFormOpen = true;
  }

  function openEdit(row: PricingPlanPrice) {
    editingPlan = {
      id: row.pricing_plan.id,
      name: row.pricing_plan.name,
      type: row.pricing_plan.type,
      is_public: row.pricing_plan.is_public,
      description: row.pricing_plan.description,
    };
    isFormOpen = true;
  }

  function openDelete(row: PricingPlanPrice) {
    pendingPlan = {
      id: row.pricing_plan.id,
      name: row.pricing_plan.name,
      type: row.pricing_plan.type,
      is_public: row.pricing_plan.is_public,
      description: row.pricing_plan.description,
    };
    confirmError = null;
    confirmDeleteOpen = true;
  }

  async function confirmDelete() {
    if (!pendingPlan) return;
    confirmLoading = true;
    confirmError = null;
    try {
      await getAdminClient().mutate({
        mutation: DELETE_PRICING_PLAN,
        variables: { id: pendingPlan.id },
      });
      confirmDeleteOpen = false;
      await load();
      onChanged();
    } catch (e) {
      confirmError = billingErrorMessage(
        e,
        "Failed to delete the plan. Plans with recorded payments cannot be removed."
      );
    } finally {
      confirmLoading = false;
    }
  }
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
          placeholder="Search pricing plans"
          bind:value={search}
          oninput={handleSearchInput}
          class="w-full bg-background border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-info/20"
        />
      </div>

      <button
        type="button"
        onclick={openAdd}
        class="flex items-center justify-center gap-2 bg-[#4D8DEE] text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm hover:opacity-90 shrink-0"
      >
        <Icon iconName="icon/plus" size={16} /> Add Pricing Plan
      </button>
    </div>

    <!-- Frequency filter -->
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
        Billing cycle
      </span>
      {#each filterTabs as tab}
        <button
          type="button"
          onclick={() => (frequency = tab.value)}
          class="px-3 py-1.5 rounded-full text-xs font-bold border transition-colors {frequency === tab.value
            ? 'bg-info text-info-foreground border-info shadow-sm'
            : 'bg-background text-muted-foreground border-border hover:bg-muted'}"
        >
          {tab.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Cards -->
  {#if loading && rows.length === 0}
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {#each Array(6) as _}
        <div class="h-64 rounded-2xl border border-border bg-card animate-pulse"></div>
      {/each}
    </div>
  {:else if rows.length === 0}
    <div class="rounded-2xl border border-dashed border-border py-16 text-center">
      <Icon iconName="icon/credit-card" size={28} class="text-muted-foreground inline mb-3" />
      <p class="text-sm font-medium text-foreground">No pricing plans yet</p>
      <p class="text-xs text-muted-foreground mt-1">
        Create a plan to define what companies can subscribe to.
      </p>
      <button
        type="button"
        onclick={openAdd}
        class="mt-4 inline-flex items-center gap-2 bg-[#4D8DEE] text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm hover:opacity-90"
      >
        <Icon iconName="icon/plus" size={16} /> Add Pricing Plan
      </button>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {#each rows as row (row.id)}
        {@const plan = row.pricing_plan}
        {@const rules = rulesToEntries(row.rules)}
        <article
          class="group relative flex flex-col rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md {plan.is_public
            ? 'border-info/40'
            : 'border-border'}"
        >
          <!-- Accent strip -->
          <div
            class="h-1.5 w-full rounded-t-2xl {plan.is_public
              ? 'bg-gradient-to-r from-info to-[#4D8DEE]'
              : 'bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/20'}"
          ></div>

          <div class="p-5 flex flex-col gap-4 flex-1">
            <!-- Header -->
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-3 min-w-0">
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 {plan.is_public
                    ? 'bg-info/10 text-info'
                    : 'bg-muted text-muted-foreground'}"
                >
                  <Icon iconName="icon/star" size={18} />
                </div>
                <div class="min-w-0">
                  <h3 class="font-bold text-foreground leading-tight truncate">{plan.name}</h3>
                  <p class="text-[11px] text-muted-foreground mt-0.5">
                    {planTypeLabel(plan.type)}
                  </p>
                </div>
              </div>
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 {plan.is_public
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-muted text-muted-foreground'}"
              >
                {plan.is_public ? "Public" : "Private"}
              </span>
            </div>

            <!-- Price -->
            <div class="flex items-baseline gap-1.5">
              <span class="text-2xl font-extrabold text-foreground tracking-tight">
                {formatCurrency(row.price)}
              </span>
              <span class="text-xs font-semibold text-muted-foreground">
                {frequencySuffix(row.frequency)}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-info/10 text-info text-[10px] font-bold"
              >
                <Icon iconName="icon/refresh-cw" size={11} />
                {frequencyLabel(row.frequency)}
              </span>
              {#if row.description}
                <span class="text-[11px] text-muted-foreground truncate">{row.description}</span>
              {/if}
            </div>

            {#if plan.description}
              <p class="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {plan.description}
              </p>
            {/if}

            <!-- Rules -->
            {#if rules.length > 0}
              <ul class="flex flex-col gap-1.5 border-t border-border pt-3">
                {#each rules as rule}
                  <li class="flex items-center justify-between gap-3 text-xs">
                    <span class="text-muted-foreground">{rule.label}</span>
                    <span class="font-semibold text-foreground text-right truncate">{rule.value}</span>
                  </li>
                {/each}
              </ul>
            {/if}

            <!-- Footer -->
            <div class="mt-auto pt-4 border-t border-border flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={plan.is_public}
                  aria-label="Toggle public visibility"
                  disabled={togglingId === plan.id}
                  onclick={() => toggleVisibility(row)}
                  class="w-10 h-5 rounded-full transition-colors shrink-0 disabled:opacity-50 {plan.is_public
                    ? 'bg-info'
                    : 'bg-muted-foreground/30'}"
                >
                  <span
                    class="block w-4 h-4 mt-0.5 rounded-full bg-white shadow transition-transform {plan.is_public
                      ? 'translate-x-5'
                      : 'translate-x-0.5'}"
                  ></span>
                </button>
                <span class="text-[11px] font-medium text-muted-foreground">
                  {plan.is_public ? "Public" : "Private"}
                </span>
              </div>

              <div class="flex items-center gap-1">
                <button
                  type="button"
                  title="Edit plan"
                  onclick={() => openEdit(row)}
                  class="p-1.5 rounded-md text-muted-foreground hover:text-info hover:bg-info/10 transition-colors"
                >
                  <Icon iconName="icon/edit" size={16} />
                </button>
                <button
                  type="button"
                  title="Delete plan"
                  onclick={() => openDelete(row)}
                  class="p-1.5 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <Icon iconName="icon/trash" size={16} />
                </button>
              </div>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}

  {#if error}
    <div class="flex items-center gap-2 text-sm text-rose-500">
      <Icon iconName="icon/alert-circle" size={16} />
      <span>{error}</span>
    </div>
  {/if}
</div>

<AddPricingPlanModal
  bind:isOpen={isFormOpen}
  plan={editingPlan}
  onSuccess={() => {
    load();
    onChanged();
  }}
/>

<ConfirmModal
  bind:isOpen={confirmDeleteOpen}
  title="Delete pricing plan"
  icon="icon/trash"
  message={`Are you sure you want to delete <strong>${pendingPlan?.name ?? "this plan"}</strong>? All of its pricing cycles will be removed.`}
  error={confirmError}
  confirmText="Delete"
  loading={confirmLoading}
  onConfirm={confirmDelete}
/>
