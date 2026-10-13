<script lang="ts">
  import type { ApolloClient, DocumentNode } from "@apollo/client";
  import Icon from "$lib/components/ui/Icon/index.js";
  import { getAdminClient } from "$graphql/client";

  type SelectItem = Record<string, any>;

  let {
    query,
    dataKey,
    filterBuilder = (search: string) => ({ name: { _ilike: `%${search}%` } }),
    displayLabel = (item: SelectItem) => {
      const label = item.name ?? item.id;
      return label
        .split("_")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    },
    valueKey = "id",
    placeholder = "Search and select...",
    initialValue = "",
    mode = "form",
    client: clientProp,
    onSelect = () => {},
  }: {
    query: DocumentNode;
    dataKey: string;
    filterBuilder?: (search: string) => Record<string, unknown>;
    displayLabel?: (item: SelectItem) => string;
    valueKey?: string;
    placeholder?: string;
    initialValue?: string;
    mode?: "filter" | "form";
    client?: ApolloClient;
    onSelect?: (item: SelectItem | null) => void;
  } = $props();

  const client = $derived(clientProp ?? getAdminClient());

  let searchText = $state("");
  let items = $state<SelectItem[]>([]);
  let selectedItem = $state<SelectItem | null>(null);
  let loading = $state(false);
  let isOpen = $state(false);
  let initialized = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout>;

  let containerRef: HTMLDivElement | undefined = $state();

  function handleClickOutside(e: MouseEvent) {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      isOpen = false;
    }
  }

  $effect(() => {
    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  });

  async function loadItems(filter: Record<string, unknown>) {
    loading = true;
    try {
      const result = await client.query({
        query,
        variables: { limit: 10, offset: 0, filter },
      });
      items = ((result.data as Record<string, any>)?.[dataKey] as SelectItem[]) ?? [];
    } catch {
      items = [];
    } finally {
      loading = false;
    }
  }

  async function loadInitialValue() {
    if (!initialValue) {
      initialized = true;
      return;
    }
    loading = true;
    try {
      const result = await client.query({
        query,
        variables: {
          limit: 1,
          offset: 0,
          filter: { [valueKey]: { _eq: initialValue } },
        },
      });
      const found = ((result.data as Record<string, any>)?.[dataKey] as SelectItem[]) ?? [];
      if (found.length > 0) {
        selectedItem = found[0];
        searchText = displayLabel(selectedItem);
      }
    } catch {
    } finally {
      loading = false;
      initialized = true;
    }
  }

  async function loadDefaults() {
    await loadItems(filterBuilder(""));
  }

  function handleInput() {
    if (selectedItem) {
      selectedItem = null;
      onSelect(null);
    }
    clearTimeout(debounceTimer);
    if (!searchText.trim()) {
      loadDefaults();
      if (items.length > 0) isOpen = true;
      return;
    }
    debounceTimer = setTimeout(async () => {
      const filter = filterBuilder(searchText);
      await loadItems(filter);
      isOpen = true;
    }, 400);
  }

  function selectItem(item: SelectItem) {
    selectedItem = item;
    searchText = displayLabel(item);
    isOpen = false;
    onSelect(item);
  }

  function handleClear() {
    selectedItem = null;
    searchText = "";
    isOpen = false;
    onSelect(null);
    loadDefaults();
  }

  function handleFocus() {
    if (items.length === 0) {
      loadDefaults().then(() => { isOpen = true; });
    } else {
      isOpen = true;
    }
  }

  $effect(() => {
    loadInitialValue().then(() => {
      if (!selectedItem) {
        loadDefaults();
      }
    });
    return () => clearTimeout(debounceTimer);
  });
</script>

<div bind:this={containerRef} class="relative min-w-[180px]">
  <div class="relative">
    <Icon
      iconName="icon/search"
      size={16}
      class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
    />
    <input
      type="text"
      bind:value={searchText}
      oninput={handleInput}
      onfocus={handleFocus}
      onblur={() => setTimeout(() => { isOpen = false; }, 200)}
      placeholder={placeholder}
      disabled={loading && !initialized}
      class="w-full h-9 pl-9 pr-8 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border disabled:opacity-50"
    />
    {#if loading}
      <Icon
        iconName="icon/refresh-cw"
        size={14}
        class="animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
    {:else if selectedItem}
      <button
        type="button"
        onclick={handleClear}
        class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label="Clear selection"
      >
        <Icon iconName="icon/x" size={14} />
      </button>
    {/if}
  </div>

  {#if isOpen}
    <div class="absolute top-full left-0 mt-1 w-full bg-background border border-input rounded shadow-lg z-50 max-h-48 overflow-y-auto">
      {#if loading}
        <div class="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
      {:else if items.length === 0}
        <div class="px-3 py-2 text-sm text-muted-foreground">
          {searchText.trim() ? "No results found" : "Type to search"}
        </div>
      {:else}
        {#each items as item}
          <button
            type="button"
            onclick={() => selectItem(item)}
            class="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer flex items-center gap-2"
          >
            <span class="flex-1">{displayLabel(item)}</span>
            {#if selectedItem && selectedItem[valueKey] === item[valueKey]}
              <Icon iconName="icon/check" size={14} class="text-info shrink-0" />
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>