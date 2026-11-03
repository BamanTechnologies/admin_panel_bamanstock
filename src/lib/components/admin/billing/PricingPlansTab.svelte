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
    <div
      class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 rounded-[2rem] border border-[#4DA0E6]/15 bg-gradient-to-br from-[#4DA0E6]/5 via-background to-[#4DA0E6]/10 p-3 sm:p-5"
    >
      {#each rows as row (row.id)}
        {@const plan = row.pricing_plan}
        {@const rules = rulesToEntries(row.rules)}
        <article
          class="group relative flex min-h-[32rem] flex-col overflow-hidden rounded-[1.75rem] border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl {plan.is_public
            ? 'border-[#4DA0E6] shadow-[#4DA0E6]/15'
            : 'border-border/80'}"
        >
          <div
            class="h-2 w-full {plan.is_public
              ? 'bg-[#4DA0E6]'
              : 'bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/10'}"
          ></div>

          <div class="flex flex-1 flex-col gap-5 p-5 sm:p-6">
            <!-- Header -->
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1 text-center">
                <div
                  class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full {plan.is_public
                    ? 'bg-[#4DA0E6]/15 text-[#4DA0E6]'
                    : 'bg-muted text-muted-foreground'}"
                >
                  <Icon iconName="icon/star" size={18} />
                </div>
                <h3 class="truncate text-lg font-bold leading-tight text-foreground">{plan.name}</h3>
                <p class="mt-1 text-[11px] text-muted-foreground">{planTypeLabel(plan.type)}</p>
              </div>
              <span
                class="absolute right-5 top-5 rounded-full px-2.5 py-1 text-[10px] font-bold {plan.is_public
                  ? 'bg-[#4DA0E6] text-white'
                  : 'bg-muted text-muted-foreground'}"
              >
                {plan.is_public ? "Public" : "Private"}
              </span>
            </div>

            <!-- Price -->
            <div class="text-center">
              <span class="text-4xl font-extrabold tracking-tight text-foreground">
                {formatCurrency(row.price)}
              </span>
              <span class="ml-1 text-xs font-semibold text-muted-foreground">{frequencySuffix(row.frequency)}</span>
              <div class="mt-2">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold {plan.is_public
                    ? 'bg-[#4DA0E6]/10 text-[#4DA0E6]'
                    : 'bg-muted text-muted-foreground'}"
                >
                  <Icon iconName="icon/refresh-cw" size={11} />
                  {frequencyLabel(row.frequency)}
                </span>
              </div>
              {#if row.description}
                <p class="mt-2 truncate text-[11px] text-muted-foreground">{row.description}</p>
              {/if}
            </div>

            {#if plan.description}
              <p class="text-center text-xs leading-relaxed text-muted-foreground line-clamp-2">
                {plan.description}
              </p>
            {/if}

            <!-- Rules -->
            {#if rules.length > 0}
              <ul class="flex flex-col gap-2.5 border-t border-border pt-4">
                {#each rules as rule}
                  <li class="flex items-center gap-2 text-xs">
                    <span
                      class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full {plan.is_public
                        ? 'bg-[#4DA0E6] text-white'
                        : 'bg-muted text-muted-foreground'}"
                    >
                      <Icon iconName="icon/check" size={10} />
                    </span>
                    <span class="min-w-0 truncate text-muted-foreground">{rule.label}</span>
                    <span class="ml-auto max-w-[40%] truncate text-right font-semibold text-foreground"
                      >{rule.value}</span
                    >
                  </li>
                {/each}
              </ul>
            {/if}

            <!-- Footer -->
            <div class="mt-auto flex flex-col gap-4 border-t border-border pt-4">
              <button
                type="button"
                onclick={() => openEdit(row)}
                class="w-full rounded-full border px-4 py-2.5 text-xs font-bold transition-colors {plan.is_public
                  ? 'border-[#4DA0E6] bg-[#4DA0E6] text-white hover:bg-[#3d8ccb]'
                  : 'border-border text-foreground hover:border-[#4DA0E6] hover:text-[#4DA0E6]'}"
              >
                Edit plan
              </button>
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={plan.is_public}
                    aria-label="Toggle public visibility"
                    disabled={togglingId === plan.id}
                    onclick={() => toggleVisibility(row)}
                    class="h-5 w-10 shrink-0 rounded-full transition-colors disabled:opacity-50 {plan.is_public
                      ? 'bg-[#4DA0E6]'
                      : 'bg-muted-foreground/30'}"
                  >
                    <span
                      class="block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 {plan.is_public
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
                    title="Delete plan"
                    onclick={() => openDelete(row)}
                    class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40"
                  >
                    <Icon iconName="icon/trash" size={16} />
                  </button>
                </div>
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
