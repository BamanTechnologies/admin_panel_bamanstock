<script lang="ts">
  import { fade } from "svelte/transition";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import Icon from "$lib/components/ui/Icon/index.js";
  import type { IconType } from "$assets/index.js";
  import BillingStats from "$lib/components/admin/billing/BillingStats.svelte";
  import PricingPlansTab from "$lib/components/admin/billing/PricingPlansTab.svelte";
  import PaymentsTab from "$lib/components/admin/billing/PaymentsTab.svelte";
  import InvoicesTab from "$lib/components/admin/billing/InvoicesTab.svelte";

  type TabKey = "plans" | "payments" | "invoices";

  const TABS: { key: TabKey; label: string; icon: IconType }[] = [
    { key: "plans", label: "Pricing Plans", icon: "icon/credit-card" },
    { key: "payments", label: "Payments", icon: "icon/dollar-sign" },
    { key: "invoices", label: "Invoices", icon: "icon/file-text" },
  ];

  function tabFromSearch(search: string): TabKey {
    const value = new URLSearchParams(search).get("tab");
    return TABS.some((tab) => tab.key === value) ? (value as TabKey) : "plans";
  }

  // The URL is the single source of truth, so a refresh (or the browser's
  // back/forward buttons) lands on the tab the user was last working in.
  const activeTab = $derived(tabFromSearch($page.url.search));

  let refreshKey = $state(0);

  function setTab(tab: TabKey) {
    if (tab === activeTab) return;
    const url = new URL($page.url);
    url.searchParams.set("tab", tab);
    goto(url, { keepFocus: true, noScroll: true });
  }

  function refresh() {
    refreshKey += 1;
  }
</script>

<svelte:head>
  <title>Billing — BamanStock</title>
</svelte:head>

<div class="space-y-6" in:fade>
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-bold text-foreground">Billing</h1>
      <p class="text-sm text-muted-foreground hidden sm:block">
        Manage pricing plans, payments and invoices.
      </p>
    </div>
    <button
      type="button"
      onclick={refresh}
      title="Refresh data"
      class="flex items-center gap-2 border border-border text-muted-foreground rounded-lg px-3 py-2 text-sm font-semibold hover:text-foreground hover:bg-muted transition-colors"
    >
      <Icon iconName="icon/refresh-cw" size={16} />
      Refresh
    </button>
  </div>

  <BillingStats {refreshKey} />

  <div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
    <div class="border-b border-border px-4 pt-3">
      <div class="flex items-center gap-1 overflow-x-auto">
        {#each TABS as tab (tab.key)}
          <button
            type="button"
            onclick={() => setTab(tab.key)}
            class={`flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? "border-[#4D8DEE] text-[#4D8DEE]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon iconName={tab.icon} size={16} />
            {tab.label}
          </button>
        {/each}
      </div>
    </div>

    <div class="p-4 sm:p-5">
      {#if activeTab === "plans"}
        <PricingPlansTab onChanged={refresh} />
      {:else if activeTab === "payments"}
        <PaymentsTab onChanged={refresh} />
      {:else}
        <InvoicesTab onChanged={refresh} />
      {/if}
    </div>
  </div>
</div>
