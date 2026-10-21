<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import Icon from "$lib/components/ui/Icon/index.js";
  import { getAdminClient } from "$graphql/client";
  import FREQUENCIES from "$graphql/queries/billing/frequencies.gql";
  import PLAN_PRICES from "$graphql/queries/billing/plan_prices.gql";
  import INSERT_PRICING_PLAN from "$graphql/mutation/billing/insert_pricing_plans.gql";
  import INSERT_FREQUENCIES from "$graphql/mutation/billing/insert_pricing_plan_frequencies.gql";
  import UPDATE_PRICING_PLAN from "$graphql/mutation/billing/update_pricing_plan.gql";
  import UPDATE_FREQUENCY_PRICE from "$graphql/mutation/billing/update_pricing_plan_prices.gql";
  import DELETE_FREQUENCY_PRICE from "$graphql/mutation/billing/delete_pricing_plan_prices.gql";
  import DELETE_PRICING_PLAN_ROW from "$graphql/mutation/billing/delete_pricing_plan_row.gql";
  import {
    FREQUENCY_LABELS,
    billingErrorMessage,
    calculatePlanAmounts,
    formatCurrency,
    frequencyLabel,
  } from "$lib/billing/index.js";

  type RuleRow = {
    key: number;
    label: string;
    value: string;
  };

  type FrequencyRow = {
    key: number;
    id: string | null;
    frequency: string;
    price: string;
    description: string;
    rules: RuleRow[];
  };

  type PlanInfo = {
    id: string;
    name: string;
    type: string | null;
    is_public: boolean;
    description: string | null;
  };

  let {
    isOpen = $bindable(false),
    plan = null as PlanInfo | null,
    onSuccess = () => {},
    onClose = () => {},
  } = $props();

  let name = $state("");
  let type = $state("standard");
  let description = $state("");
  let isPublic = $state(false);
  let rows = $state<FrequencyRow[]>([]);
  let frequencies = $state<{ name: string; display_order: number }[]>([]);
  let loading = $state(false);
  let loadingPlan = $state(false);
  let error = $state<string | null>(null);
  /** Ids of the cycles that existed when the modal opened, so removed ones can be deleted on save. */
  let originalIds: string[] = [];

  const isEditing = $derived(!!plan);
  let nextKey = 1;
  let nextRuleKey = 1;

  function blankRow(frequency = "monthly"): FrequencyRow {
    return { key: nextKey++, id: null, frequency, price: "", description: "", rules: [] };
  }

  function blankRule(): RuleRow {
    return { key: nextRuleKey++, label: "", value: "" };
  }

  /** Turns the `rules` jsonb blob of a cycle into editable rows. */
  function jsonToRules(rules: unknown): RuleRow[] {
    if (!rules || typeof rules !== "object" || Array.isArray(rules)) return [];
    return Object.entries(rules as Record<string, unknown>).map(([label, value]) => ({
      key: nextRuleKey++,
      label,
      value:
        typeof value === "boolean"
          ? value
            ? "Yes"
            : "No"
          : Array.isArray(value)
            ? value.join(", ")
            : String(value ?? ""),
    }));
  }

  /** Turns the editable rows of a cycle back into the `rules` jsonb blob. */
  function rulesToJson(rules: RuleRow[]): Record<string, string> | null {
    const entries = rules
      .map((rule) => [rule.label.trim(), rule.value.trim()] as const)
      .filter(([label]) => label.length > 0);
    return entries.length ? Object.fromEntries(entries) : null;
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

  async function loadPlanPrices(planId: string) {
    loadingPlan = true;
    try {
      const result = await getAdminClient().query<{
        billing_pricing_plan_frequency_prices: {
          id: string;
          price: number;
          frequency: string;
          description: string | null;
          rules: Record<string, unknown> | null;
        }[];
      }>({
        query: PLAN_PRICES,
        variables: { filter: { pricing_plan_id: { _eq: planId } } },
      });
      rows = (result.data?.billing_pricing_plan_frequency_prices ?? []).map((p) => ({
        key: nextKey++,
        id: p.id,
        frequency: p.frequency,
        price: String(p.price),
        description: p.description ?? "",
        rules: jsonToRules(p.rules),
      }));
      originalIds = rows.map((r) => r.id).filter(Boolean) as string[];
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load plan prices.";
    } finally {
      loadingPlan = false;
    }
  }

  $effect(() => {
    if (!isOpen) return;
    error = null;
    loadFrequencies();
    if (plan) {
      name = plan.name ?? "";
      type = plan.type ?? "standard";
      description = plan.description ?? "";
      isPublic = !!plan.is_public;
      loadPlanPrices(plan.id);
    } else {
      name = "";
      type = "standard";
      description = "";
      isPublic = false;
      originalIds = [];
      rows = [blankRow()];
    }
  });

  /** Amounts for a single cycle — never summed across cycles. */
  function amountsFor(row: FrequencyRow) {
    return calculatePlanAmounts(Number(row.price) || 0);
  }

  function addRow() {
    const used = new Set(rows.map((r) => r.frequency));
    const next =
      frequencies.find((f) => !used.has(f.name))?.name ??
      frequencies.find((f) => f.name === "monthly")?.name ??
      "monthly";
    rows = [...rows, blankRow(next)];
  }

  function removeRow(key: number) {
    if (rows.length === 1) return;
    rows = rows.filter((r) => r.key !== key);
  }

  function addRule(rowKey: number) {
    const row = rows.find((r) => r.key === rowKey);
    if (!row) return;
    row.rules = [...row.rules, blankRule()];
  }

  function removeRule(rowKey: number, ruleKey: number) {
    const row = rows.find((r) => r.key === rowKey);
    if (!row) return;
    row.rules = row.rules.filter((r) => r.key !== ruleKey);
  }

  function handleClose() {
    if (loading) return;
    isOpen = false;
    onClose();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) handleClose();
  }

  function handleEscape(e: KeyboardEvent) {
    if (e.key === "Escape") handleClose();
  }

  function validate(): string | null {
    if (!name.trim()) return "Plan name is required.";
    if (rows.length === 0) return "Add at least one pricing frequency.";

    const seen = new Set<string>();
    for (const row of rows) {
      if (!row.frequency) return "Every frequency needs a billing cycle.";
      if (seen.has(row.frequency)) {
        return `The "${frequencyLabel(row.frequency)}" cycle is listed more than once.`;
      }
      seen.add(row.frequency);

      const price = Number(row.price);
      if (!Number.isFinite(price) || price <= 0) {
        return `Enter a valid price for the "${frequencyLabel(row.frequency)}" cycle.`;
      }

      const labels = new Set<string>();
      for (const rule of row.rules) {
        const label = rule.label.trim();
        if (!label) {
          if (rule.value.trim()) {
            return `Give every rule of the "${frequencyLabel(row.frequency)}" cycle a name.`;
          }
          continue;
        }
        const key = label.toLowerCase();
        if (labels.has(key)) {
          return `The rule "${label}" is listed more than once in the "${frequencyLabel(row.frequency)}" cycle.`;
        }
        labels.add(key);
      }
    }
    return null;
  }

  async function handleSubmit() {
    if (loading) return;
    const validationError = validate();
    if (validationError) {
      error = validationError;
      return;
    }

    error = null;
    loading = true;

    const client = getAdminClient();
    const priceRows = rows.map((row) => ({
      frequency: row.frequency,
      price: Number(row.price),
      description: row.description.trim() || null,
      rules: rulesToJson(row.rules),
    }));

    try {
      if (isEditing && plan) {
        await client.mutate({
          mutation: UPDATE_PRICING_PLAN,
          variables: {
            id: plan.id,
            set: {
              name: name.trim(),
              type: type.trim() || null,
              description: description.trim() || null,
              is_public: isPublic,
            },
          },
        });

        const keptIds = new Set(rows.map((r) => r.id).filter(Boolean) as string[]);

        for (const row of rows) {
          if (row.id) {
            await client.mutate({
              mutation: UPDATE_FREQUENCY_PRICE,
              variables: {
                id: row.id,
                set: {
                  frequency: row.frequency,
                  price: Number(row.price),
                  description: row.description.trim() || null,
                  rules: rulesToJson(row.rules),
                },
              },
            });
          } else {
            await client.mutate({
              mutation: INSERT_FREQUENCIES,
              variables: {
                objects: [
                  {
                    pricing_plan_id: plan.id,
                    frequency: row.frequency,
                    price: Number(row.price),
                    description: row.description.trim() || null,
                    rules: rulesToJson(row.rules),
                  },
                ],
              },
            });
          }
        }

        // Remove cycles that were dropped from the plan.
        const removed = originalIds.filter((id) => !keptIds.has(id));
        for (const id of removed) {
          await client.mutate({
            mutation: DELETE_FREQUENCY_PRICE,
            variables: { id },
          });
        }
      } else {
        const created = await client.mutate<{
          insert_billing_pricing_plans_one: { id: string };
        }>({
          mutation: INSERT_PRICING_PLAN,
          variables: {
            object: {
              name: name.trim(),
              type: type.trim() || null,
              description: description.trim() || null,
              is_public: isPublic,
            },
          },
        });

        const planId = created.data?.insert_billing_pricing_plans_one?.id;
        if (!planId) throw new Error("The pricing plan could not be created.");

        try {
          await client.mutate({
            mutation: INSERT_FREQUENCIES,
            variables: {
              objects: priceRows.map((row) => ({ ...row, pricing_plan_id: planId })),
            },
          });
        } catch (priceError) {
          // Do not leave a plan behind without any pricing attached to it.
          try {
            await client.mutate({
              mutation: DELETE_PRICING_PLAN_ROW,
              variables: { id: planId },
            });
          } catch {
            /* ignore */
          }
          throw priceError;
        }
      }

      isOpen = false;
      onSuccess();
    } catch (e) {
      error = billingErrorMessage(e, "Failed to save the pricing plan.");
    } finally {
      loading = false;
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    onclick={handleBackdropClick}
    onkeydown={handleEscape}
    role="dialog"
    aria-modal="true"
    aria-labelledby="pricing-plan-title"
    tabindex="-1"
  >
    <div
      class="bg-card rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto"
    >
      <div class="flex items-start justify-between gap-4 p-6 border-b border-border sticky top-0 bg-card z-10 rounded-t-2xl">
        <div>
          <h2 id="pricing-plan-title" class="text-xl font-bold text-foreground">
            {isEditing ? "Edit Pricing Plan" : "Add Pricing Plan"}
          </h2>
          <p class="text-sm text-muted-foreground mt-1">
            {isEditing
              ? "Update the plan details and its billing cycles."
              : "Define the plan once, then price it for every billing cycle."}
          </p>
        </div>
        <button
          type="button"
          class="p-1 rounded-md hover:bg-muted transition-colors disabled:opacity-30"
          onclick={handleClose}
          disabled={loading}
          aria-label="Close modal"
        >
          <Icon iconName="icon/x" size={20} class="text-foreground" />
        </button>
      </div>

      <form
        novalidate
        class="p-6 flex flex-col gap-8"
        onsubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {#if error}
          <div class="p-3 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <Icon iconName="icon/alert-circle" size={16} class="text-destructive shrink-0 mt-0.5" />
            <p class="text-sm text-destructive break-words">{error}</p>
          </div>
        {/if}

        <!-- Plan information -->
        <section class="flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-info/10 text-info flex items-center justify-center shrink-0">
              <Icon iconName="icon/credit-card" size={18} />
            </div>
            <div>
              <h3 class="text-base font-bold text-foreground">Payment Plan Information</h3>
              <p class="text-xs text-muted-foreground">The plan customers subscribe to.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label for="plan-name" class="text-sm font-medium text-foreground">
                Plan name <span class="text-destructive">*</span>
              </label>
              <input
                id="plan-name"
                type="text"
                bind:value={name}
                placeholder="e.g. Growth Plan"
                class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="plan-type" class="text-sm font-medium text-foreground">Plan type</label>
              <input
                id="plan-type"
                type="text"
                bind:value={type}
                list="plan-type-options"
                placeholder="standard"
                class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
              />
              <datalist id="plan-type-options">
                <option value="standard"></option>
                <option value="premium"></option>
                <option value="enterprise"></option>
                <option value="starter"></option>
              </datalist>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="plan-description" class="text-sm font-medium text-foreground">Description</label>
            <textarea
              id="plan-description"
              rows="3"
              bind:value={description}
              placeholder="Short summary shown to subscribers..."
              class="px-3 py-2 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border resize-y"
            ></textarea>
          </div>

          <div class="flex items-center justify-between gap-4 border border-border rounded-xl px-4 py-3 bg-muted/40">
            <div>
              <p class="text-sm font-medium text-foreground">Public plan</p>
              <p class="text-xs text-muted-foreground">
                Public plans are visible to every company and can be subscribed to.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              aria-label="Toggle public visibility"
              onclick={() => (isPublic = !isPublic)}
              class="w-11 h-6 rounded-full transition-colors shrink-0 {isPublic ? 'bg-info' : 'bg-muted-foreground/30'}"
            >
              <span
                class="block w-5 h-5 mt-0.5 rounded-full bg-white shadow transition-transform {isPublic ? 'translate-x-5' : 'translate-x-0.5'}"
              ></span>
            </button>
          </div>
        </section>

        <div class="h-px bg-border"></div>

        <!-- Frequencies -->
        <section class="flex flex-col gap-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Icon iconName="icon/calendar" size={18} />
              </div>
              <div>
                <h3 class="text-base font-bold text-foreground">Pricing Cycles</h3>
                <p class="text-xs text-muted-foreground">
                  Add the price and the rules of each billing cycle.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onclick={addRow}
              class="border-border text-foreground hover:bg-muted shrink-0"
            >
              <Icon iconName="icon/plus" size={16} /> Add cycle
            </Button>
          </div>

          {#if loadingPlan}
            <div class="space-y-2">
              {#each Array(2) as _}
                <div class="h-14 rounded-xl bg-muted animate-pulse"></div>
              {/each}
            </div>
          {:else}
            <div class="flex flex-col gap-3">
              {#each rows as row (row.key)}
                {@const amount = amountsFor(row)}
                <div class="flex flex-col gap-3 border border-border rounded-xl p-3 bg-muted/30">
                  <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div class="md:col-span-3 flex flex-col gap-1.5">
                      <label class="text-xs font-medium text-muted-foreground" for={`freq-${row.key}`}>
                        Billing cycle
                      </label>
                      <select
                        id={`freq-${row.key}`}
                        bind:value={row.frequency}
                        class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground focus:outline-none focus:border-border"
                      >
                        {#each frequencies as f}
                          <option value={f.name}>{FREQUENCY_LABELS[f.name] ?? f.name}</option>
                        {/each}
                      </select>
                    </div>

                    <div class="md:col-span-3 flex flex-col gap-1.5">
                      <label class="text-xs font-medium text-muted-foreground" for={`price-${row.key}`}>
                        Price
                      </label>
                      <input
                        id={`price-${row.key}`}
                        type="number"
                        min="0"
                        step="0.01"
                        bind:value={row.price}
                        placeholder="0.00"
                        class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
                      />
                    </div>

                    <div class="md:col-span-5 flex flex-col gap-1.5">
                      <label class="text-xs font-medium text-muted-foreground" for={`desc-${row.key}`}>
                        Cycle note <span class="font-normal">(optional)</span>
                      </label>
                      <input
                        id={`desc-${row.key}`}
                        type="text"
                        bind:value={row.description}
                        placeholder="e.g. Includes 5 branches"
                        class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
                      />
                    </div>

                    <div class="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onclick={() => removeRow(row.key)}
                        disabled={rows.length === 1}
                        class="p-2 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                        aria-label="Remove billing cycle"
                      >
                        <Icon iconName="icon/trash" size={16} />
                      </button>
                    </div>
                  </div>

                  <!-- Amounts for this cycle only -->
                  <div
                    class="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <div>
                      <p class="text-[11px] uppercase tracking-wide text-muted-foreground">Subtotal</p>
                      <p class="text-sm font-bold text-foreground mt-0.5">
                        {formatCurrency(amount.subtotal)}
                      </p>
                    </div>
                    <div>
                      <p class="text-[11px] uppercase tracking-wide text-muted-foreground">VAT (15%)</p>
                      <p class="text-sm font-bold text-foreground mt-0.5">{formatCurrency(amount.vat)}</p>
                    </div>
                    <div>
                      <p class="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Withholding (2%)
                      </p>
                      <p class="text-sm font-bold text-foreground mt-0.5">
                        {formatCurrency(amount.withholding)}
                      </p>
                    </div>
                    <div>
                      <p class="text-[11px] uppercase tracking-wide text-muted-foreground">Total</p>
                      <p class="text-sm font-bold text-info mt-0.5">{formatCurrency(amount.total)}</p>
                    </div>
                  </div>

                  <!-- Rules of this cycle -->
                  <div class="flex flex-col gap-2 rounded-lg border border-border bg-background px-3 py-2">
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-2">
                        <Icon iconName="icon/check-circle" size={14} class="text-muted-foreground" />
                        <span class="text-xs font-semibold text-foreground">Rules &amp; features</span>
                        {#if row.rules.length > 0}
                          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {row.rules.length}
                          </span>
                        {/if}
                      </div>
                      <button
                        type="button"
                        onclick={() => addRule(row.key)}
                        class="flex items-center gap-1 text-xs font-bold text-info hover:underline"
                      >
                        <Icon iconName="icon/plus" size={13} /> Add rule
                      </button>
                    </div>

                    {#if row.rules.length > 0}
                      <div class="flex flex-col gap-2">
                        {#each row.rules as rule (rule.key)}
                          <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            <div class="sm:col-span-5">
                              <input
                                id={`rule-${row.key}-${rule.key}-label`}
                                type="text"
                                bind:value={rule.label}
                                placeholder="Feature, e.g. Branches"
                                aria-label="Rule name"
                                class="h-8 px-2.5 border border-border rounded-md bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
                              />
                            </div>
                            <div class="sm:col-span-6">
                              <input
                                id={`rule-${row.key}-${rule.key}-value`}
                                type="text"
                                bind:value={rule.value}
                                placeholder="Value, e.g. 5"
                                aria-label="Rule value"
                                class="h-8 px-2.5 border border-border rounded-md bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
                              />
                            </div>
                            <div class="sm:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onclick={() => removeRule(row.key, rule.key)}
                                class="p-1.5 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                aria-label="Remove rule"
                              >
                                <Icon iconName="icon/trash" size={14} />
                              </button>
                            </div>
                          </div>
                        {/each}
                      </div>
                    {:else}
                      <p class="text-[11px] text-muted-foreground">
                        No rules for this cycle yet. Add the features included in this plan.
                      </p>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </section>

        <div class="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Button
            variant="outline"
            type="button"
            onclick={handleClose}
            disabled={loading}
            class="border-border text-foreground hover:bg-muted"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading} class="min-w-[150px]">
            {#if loading}
              <Icon iconName="icon/refresh-cw" size={16} class="animate-spin" />
            {:else}
              <Icon iconName="icon/save" size={16} />
            {/if}
            {isEditing ? "Save Changes" : "Create Pricing Plan"}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}
