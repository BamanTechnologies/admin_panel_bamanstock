<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import Icon from "$lib/components/ui/Icon/index.js";
  import SearchSelect from "$lib/components/admin/search-select/SearchSelect.svelte";
  import FileUpload from "$lib/components/admin/file-upload/FileUpload.svelte";
  import { getAdminClient } from "$graphql/client";
  import COMPANY_OPTIONS from "$graphql/queries/companies/options.gql";
  import PLAN_OPTIONS from "$graphql/queries/billing/plan_options.gql";
  import PAYMENT_METHODS from "$graphql/queries/billing/payment_methods.gql";
  import INSERT_PAYMENT from "$graphql/mutation/billing/insert_payment.gql";
  import {
    calculatePlanAmounts,
    formatCurrency,
    frequencyLabel,
    planTypeLabel,
  } from "$lib/billing/index.js";

  type SelectedPlan = {
    id: string;
    price: number;
    frequency: string;
    pricing_plan: {
      id: string;
      name: string;
      type: string | null;
      is_public: boolean;
    };
  };

  type SelectedCompany = {
    id: string;
    name: string;
    tin_number: string | number | null;
    license: string | null;
  };

  let {
    isOpen = $bindable(false),
    onSuccess = () => {},
    onClose = () => {},
  } = $props();

  let step = $state<1 | 2>(1);
  let company = $state<SelectedCompany | null>(null);
  let plan = $state<SelectedPlan | null>(null);
  let paymentDate = $state(today());
  let paymentMethod = $state("bank_transfer");
  let transactionId = $state("");
  let referenceId = $state("");
  let referenceFile = $state("");
  let transactionNote = $state("");
  let methods = $state<{ name: string }[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);

  const STEPS = [
    { id: 1, label: "Select Plan" },
    { id: 2, label: "Payment Details" },
  ];

  function today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  const totals = $derived(
    plan ? calculatePlanAmounts(Number(plan.price) || 0) : { subtotal: 0, vat: 0, withholding: 0, total: 0 }
  );

  async function loadMethods() {
    try {
      const result = await getAdminClient().query<{ billing_payment_methods: { name: string }[] }>({
        query: PAYMENT_METHODS,
        variables: { limit: 50, offset: 0 },
      });
      methods = result.data?.billing_payment_methods ?? [];
      if (methods.length > 0 && !methods.some((m) => m.name === paymentMethod)) {
        paymentMethod = methods[0].name;
      }
    } catch {
      methods = [];
    }
  }

  $effect(() => {
    if (!isOpen) return;
    step = 1;
    company = null;
    plan = null;
    paymentDate = today();
    transactionId = "";
    referenceId = "";
    referenceFile = "";
    transactionNote = "";
    error = null;
    loadMethods();
  });

  function companyFilter(search: string) {
    return { name: { _ilike: `%${search}%` } };
  }

  function planFilter(search: string) {
    return { pricing_plan: { name: { _ilike: `%${search}%` } } };
  }

  function planLabel(item: Record<string, any>): string {
    const p = item.pricing_plan ?? {};
    return `${p.name ?? "Plan"} · ${frequencyLabel(item.frequency)} · ${formatCurrency(item.price)}`;
  }

  function companyLabel(item: Record<string, any>): string {
    return item.name ?? item.id;
  }

  function goNext() {
    error = null;
    if (!company) {
      error = "Select the company this payment belongs to.";
      return;
    }
    if (!plan) {
      error = "Select a pricing plan for this payment.";
      return;
    }
    step = 2;
  }

  function goBack() {
    error = null;
    step = 1;
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

  async function handleSubmit() {
    if (loading) return;
    if (!company || !plan) {
      error = "Select a company and a pricing plan first.";
      step = 1;
      return;
    }
    if (!paymentDate) {
      error = "Enter the payment date.";
      return;
    }

    error = null;
    loading = true;
    try {
      await getAdminClient().mutate({
        mutation: INSERT_PAYMENT,
        variables: {
          object: {
            pricing_plan_frequency_id: plan.id,
            company_id: company.id,
            payment_date: paymentDate,
            payment_method: paymentMethod,
            transaction_id: transactionId.trim() || null,
            reference_id: referenceId.trim() || null,
            reference_file: referenceFile.trim() || null,
            transaction_note: transactionNote.trim() || null,
          },
        },
      });
      isOpen = false;
      onSuccess();
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to create the payment.";
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
    aria-labelledby="add-payment-title"
    tabindex="-1"
  >
    <div
      class="bg-card rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto"
    >
      <div class="flex items-start justify-between gap-4 p-6 border-b border-border">
        <div>
          <h2 id="add-payment-title" class="text-xl font-bold text-foreground">Add Payment</h2>
          <p class="text-sm text-muted-foreground mt-1">
            Record a manual payment made by a company.
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

      <!-- Stepper -->
      <div class="px-6 pt-6">
        <ol class="flex items-center gap-3">
          {#each STEPS as s, i}
            <li class="flex items-center gap-3 {i < STEPS.length - 1 ? 'flex-1' : ''}">
              <div class="flex items-center gap-2">
                <span
                  class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors {step > s.id
                    ? 'bg-emerald-500 text-white'
                    : step === s.id
                      ? 'bg-info text-info-foreground'
                      : 'bg-muted text-muted-foreground'}"
                >
                  {#if step > s.id}
                    <Icon iconName="icon/check" size={14} />
                  {:else}
                    {s.id}
                  {/if}
                </span>
                <span
                  class="text-sm font-semibold {step === s.id
                    ? 'text-foreground'
                    : step > s.id
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground'}"
                >
                  {s.label}
                </span>
              </div>
              {#if i < STEPS.length - 1}
                <span class="h-px flex-1 bg-border"></span>
              {/if}
            </li>
          {/each}
        </ol>
      </div>

      <form
        novalidate
        class="p-6 flex flex-col gap-5"
        onsubmit={(e) => {
          e.preventDefault();
          if (step === 1) goNext();
          else handleSubmit();
        }}
      >
        {#if error}
          <div class="p-3 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <Icon iconName="icon/alert-circle" size={16} class="text-destructive shrink-0 mt-0.5" />
            <p class="text-sm text-destructive break-words">{error}</p>
          </div>
        {/if}

        {#if step === 1}
          <div class="flex flex-col gap-5">
            <div class="flex flex-col gap-1.5">
              <span class="text-sm font-medium text-foreground">Company <span class="text-destructive">*</span></span>
              <SearchSelect
                query={COMPANY_OPTIONS}
                dataKey="companies"
                filterBuilder={companyFilter}
                displayLabel={companyLabel}
                valueKey="id"
                placeholder="Search and select a company..."
                selected={company}
                onSelect={(item) => (company = (item as SelectedCompany) ?? null)}
              />
              {#if company}
                <p class="text-[11px] text-muted-foreground">
                  {#if company.tin_number}TIN {company.tin_number}{:else}No TIN on record{/if}
                  {#if company.license} · License {company.license}{/if}
                </p>
              {/if}
            </div>

            <div class="flex flex-col gap-1.5">
              <span class="text-sm font-medium text-foreground">Pricing plan <span class="text-destructive">*</span></span>
              <SearchSelect
                query={PLAN_OPTIONS}
                dataKey="billing_pricing_plan_frequency_prices"
                filterBuilder={planFilter}
                displayLabel={planLabel}
                valueKey="id"
                placeholder="Search and select a pricing plan..."
                selected={plan}
                onSelect={(item) => (plan = (item as SelectedPlan) ?? null)}
              />
              <p class="text-[11px] text-muted-foreground">
                Pick the plan and billing cycle the company paid for.
              </p>
            </div>

            {#if plan}
              <div class="rounded-2xl border border-info/30 bg-info/5 p-5">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-base font-bold text-foreground">{plan.pricing_plan.name}</p>
                    <p class="text-xs text-muted-foreground mt-0.5">
                      {planTypeLabel(plan.pricing_plan.type)} · {frequencyLabel(plan.frequency)}
                    </p>
                  </div>
                  <p class="text-xl font-extrabold text-foreground">{formatCurrency(plan.price)}</p>
                </div>

                <div class="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-info/20">
                  <div>
                    <p class="text-[11px] uppercase tracking-wide text-muted-foreground">Subtotal</p>
                    <p class="text-sm font-bold text-foreground mt-0.5">{formatCurrency(totals.subtotal)}</p>
                  </div>
                  <div>
                    <p class="text-[11px] uppercase tracking-wide text-muted-foreground">VAT (15%)</p>
                    <p class="text-sm font-bold text-foreground mt-0.5">{formatCurrency(totals.vat)}</p>
                  </div>
                  <div>
                    <p class="text-[11px] uppercase tracking-wide text-muted-foreground">Total</p>
                    <p class="text-sm font-bold text-info mt-0.5">{formatCurrency(totals.total)}</p>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {:else}
          <div class="flex flex-col gap-5">
            <!-- Selected plan recap -->
            <div class="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
              <div class="min-w-0">
                <p class="text-sm font-bold text-foreground truncate">
                  {plan?.pricing_plan.name ?? "—"}
                  <span class="font-normal text-muted-foreground">
                    · {frequencyLabel(plan?.frequency)}
                  </span>
                </p>
                <p class="text-xs text-muted-foreground truncate">{company?.name ?? "—"}</p>
              </div>
              <p class="text-base font-extrabold text-foreground shrink-0">
                {formatCurrency(totals.total)}
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label for="payment-date" class="text-sm font-medium text-foreground">
                  Payment date <span class="text-destructive">*</span>
                </label>
                <input
                  id="payment-date"
                  type="date"
                  bind:value={paymentDate}
                  class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground focus:outline-none focus:border-border"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="payment-method" class="text-sm font-medium text-foreground">
                  Payment method
                </label>
                <select
                  id="payment-method"
                  bind:value={paymentMethod}
                  class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground focus:outline-none focus:border-border"
                >
                  {#each methods as m}
                    <option value={m.name}>{m.name.replace(/_/g, " ")}</option>
                  {/each}
                </select>
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="transaction-id" class="text-sm font-medium text-foreground">
                  Transaction ID
                </label>
                <input
                  id="transaction-id"
                  type="text"
                  bind:value={transactionId}
                  placeholder="Bank transfer reference"
                  class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="reference-id" class="text-sm font-medium text-foreground">Reference ID</label>
                <input
                  id="reference-id"
                  type="text"
                  bind:value={referenceId}
                  placeholder="Receipt / cheque number"
                  class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
                />
              </div>
            </div>

            <FileUpload
              folder="payments"
              maxFiles={1}
              label="Reference file"
              hint="Receipt or bank statement — PNG, JPG or PDF up to 10 MB."
              onChange={(urls: string[]) => (referenceFile = urls[0] ?? "")}
            />

            <div class="flex flex-col gap-1.5">
              <label for="transaction-note" class="text-sm font-medium text-foreground">
                Transaction note
              </label>
              <textarea
                id="transaction-note"
                rows="3"
                bind:value={transactionNote}
                placeholder="Anything the approver should know..."
                class="px-3 py-2 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border resize-y"
              ></textarea>
            </div>

            <div class="rounded-xl border border-border bg-muted/40 p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p class="text-[11px] uppercase tracking-wide text-muted-foreground">Subtotal</p>
                <p class="text-sm font-bold text-foreground mt-0.5">{formatCurrency(totals.subtotal)}</p>
              </div>
              <div>
                <p class="text-[11px] uppercase tracking-wide text-muted-foreground">VAT (15%)</p>
                <p class="text-sm font-bold text-foreground mt-0.5">{formatCurrency(totals.vat)}</p>
              </div>
              <div>
                <p class="text-[11px] uppercase tracking-wide text-muted-foreground">Withholding (2%)</p>
                <p class="text-sm font-bold text-foreground mt-0.5">{formatCurrency(totals.withholding)}</p>
              </div>
              <div>
                <p class="text-[11px] uppercase tracking-wide text-muted-foreground">Total</p>
                <p class="text-sm font-bold text-info mt-0.5">{formatCurrency(totals.total)}</p>
              </div>
            </div>
          </div>
        {/if}

        <div class="flex items-center justify-between gap-3 pt-2 border-t border-border">
          <div>
            {#if step === 2}
              <Button
                variant="outline"
                type="button"
                onclick={goBack}
                disabled={loading}
                class="border-border text-foreground hover:bg-muted"
              >
                <Icon iconName="icon/arrow-left" size={16} /> Back
              </Button>
            {/if}
          </div>

          {#if step === 1}
            <Button type="submit" disabled={loading} class="min-w-[140px]">
              Continue <Icon iconName="icon/arrow-right" size={16} />
            </Button>
          {:else}
            <Button type="submit" disabled={loading} class="min-w-[160px]">
              {#if loading}
                <Icon iconName="icon/refresh-cw" size={16} class="animate-spin" />
              {:else}
                <Icon iconName="icon/check" size={16} />
              {/if}
              Create Payment
            </Button>
          {/if}
        </div>
      </form>
    </div>
  </div>
{/if}
