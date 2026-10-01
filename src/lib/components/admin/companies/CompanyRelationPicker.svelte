<script lang="ts">
  import type { DocumentNode } from "@apollo/client";
  import Icon from "$lib/components/ui/Icon/index.js";
  import { getAdminClient } from "$graphql/client";

  type SelectItem = Record<string, any>;
  type Option = { id: string; label: string; status?: boolean };

  let {
    query,
    dataKey,
    filterBuilder = (search: string) => ({ name: { _ilike: `%${search}%` } }),
    displayLabel = (item: SelectItem) => `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim(),
    valueKey = "id",
    placeholder = "Search and select...",
    statusKey = "",
    selected = $bindable([] as Option[]),
  }: {
    query: DocumentNode;
    dataKey: string;
    filterBuilder?: (search: string) => Record<string, unknown>;
    displayLabel?: (item: SelectItem) => string;
    valueKey?: string;
    placeholder?: string;
    statusKey?: string;
    selected?: Option[];
  } = $props();

  let searchText = $state("");
  let items = $state<SelectItem[]>([]);
  let loading = $state(false);
  let isOpen = $state(false);
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

  async function load(filter: Record<string, unknown>) {
    loading = true;
    try {
      const result = await getAdminClient().query({
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

  function handleInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      await load(filterBuilder(searchText));
      isOpen = true;
    }, 400);
  }

  function handleFocus() {
    if (items.length === 0) {
      load(filterBuilder("")).then(() => { isOpen = true; });
    } else {
      isOpen = true;
    }
  }

  function isSelected(id: string): boolean {
    return selected.some((o) => o.id === id);
  }

  function toggle(item: SelectItem) {
    const id = item[valueKey];
    if (isSelected(id)) {
      selected = selected.filter((o) => o.id !== id);
    } else {
      selected = [
        ...selected,
        {
          id,
          label: displayLabel(item),
          status: statusKey ? Boolean(item[statusKey]) : undefined,
        },
      ];
    }
  }

  function remove(id: string) {
    selected = selected.filter((o) => o.id !== id);
  }
</script>

<div bind:this={containerRef} class="relative">
  {#if selected.length > 0}
    <div class="flex flex-wrap gap-1.5 mb-1.5">
      {#each selected as option}
        <span class="inline-flex items-center gap-1 rounded-full bg-info/10 text-info px-2.5 py-1 text-xs font-medium">
          {#if typeof option.status === "boolean"}
            <span
              class="size-1.5 rounded-full {option.status ? 'bg-emerald-500' : 'bg-muted-foreground'}"
              aria-hidden="true"
            ></span>
          {/if}
          {option.label}
          <button
            type="button"
            aria-label={`Remove ${option.label}`}
            class="hover:text-foreground transition-colors"
            onclick={() => remove(option.id)}
          >
            <Icon iconName="icon/x" size={12} />
          </button>
        </span>
      {/each}
    </div>
  {/if}

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
      class="w-full h-9 pl-9 pr-8 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
    />
    {#if loading}
      <Icon
        iconName="icon/refresh-cw"
        size={14}
        class="animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
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
            onclick={() => { toggle(item); searchText = ""; }}
            class="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer flex items-center justify-between gap-2"
          >
            <span class="flex items-center gap-2 flex-1 min-w-0">
              <span class="truncate">{displayLabel(item)}</span>
              {#if statusKey}
                {#if item[statusKey]}
                  <span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                    <Icon iconName="icon/check-circle" size={11} /> Active
                  </span>
                {:else}
                  <span class="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                    <Icon iconName="icon/user-minus" size={11} /> Inactive
                  </span>
                {/if}
              {/if}
            </span>
            {#if isSelected(item[valueKey])}
              <Icon iconName="icon/check" size={14} class="text-info shrink-0" />
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>