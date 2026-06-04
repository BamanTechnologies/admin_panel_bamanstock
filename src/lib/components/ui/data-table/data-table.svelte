<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import Icon from "$lib/components/ui/Icon/index.js";

  interface Column<T> {
    key: keyof T | string;
    label: string;
    sortable?: boolean;
    render?: (row: T) => any;
  }

  interface Props<T> {
    columns: Column<T>[];
    data: T[];
    searchable?: boolean;
    searchPlaceholder?: string;
    filters?: Array<{
      key: string;
      label: string;
      options: Array<{ value: string; label: string }>;
    }>;
    actions?: Array<{
      icon: any;
      label: string;
      onClick: (row: T) => void;
      variant?: "default" | "destructive";
    }>;
    pagination?: {
      currentPage: number;
      totalPages: number;
      rowsPerPage: number;
      onPageChange: (page: number) => void;
      onRowsPerPageChange: (rows: number) => void;
    };
    onSearch?: (query: string) => void;
    onFilterChange?: (filterKey: string, value: string) => void;
  }

  let {
    columns,
    data,
    searchable = true,
    searchPlaceholder = "Search",
    filters = [],
    actions = [],
    pagination,
    onSearch,
    onFilterChange,
  }: Props<any> = $props();

  let searchQuery = $state("");
  let filterValues = $state<Record<string, string>>({});

  function handleSearch(value: string) {
    searchQuery = value;
    onSearch?.(value);
  }

  function handleFilterChange(key: string, value: string) {
    filterValues[key] = value;
    onFilterChange?.(key, value);
  }
</script>

<div class="bg-card border border-border rounded-lg">
  <!-- Search and Filters -->
  {#if searchable || filters.length > 0}
    <div class="p-4 border-b border-border flex items-center gap-4">
      {#if searchable}
        <div class="flex-1 relative">
          <Icon
            iconName="icon/search"
            size={18}
            class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            class="pl-10 w-full"
            value={searchQuery}
            oninput={(e) => handleSearch(e.currentTarget.value)}
          />
        </div>
      {/if}
      {#each filters as filter}
        <select
          class="px-4 py-2 border border-border rounded-md bg-background text-foreground"
          value={filterValues[filter.key] || ""}
          onchange={(e) =>
            handleFilterChange(filter.key, e.currentTarget.value)}
        >
          {#each filter.options as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      {/each}
    </div>
  {/if}

  <!-- Table -->
  <div class="overflow-x-auto">
    <table class="w-full">
      <thead class="bg-muted/50">
        <tr>
          <th class="px-4 py-3 text-left">
            <input type="checkbox" class="rounded" />
          </th>
          {#each columns as column}
            <th class="px-4 py-3 text-left text-sm font-medium text-foreground">
              <div class="flex items-center gap-1">
                {column.label}
                {#if column.sortable}
                  <div class="flex flex-col">
                    <Icon
                      iconName="icon/chevron-up"
                      size={10}
                      class="text-muted-foreground -mb-0.5"
                    />
                    <Icon
                      iconName="icon/chevron-down"
                      size={10}
                      class="text-muted-foreground"
                    />
                  </div>
                {/if}
              </div>
            </th>
          {/each}
          {#if actions.length > 0}
            {#each actions as _}
              <th
                class="px-4 py-3 text-left text-sm font-medium text-foreground"
              ></th>
            {/each}
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each data as row}
          <tr class="border-b border-border hover:bg-muted/30">
            <td class="px-4 py-3">
              <input type="checkbox" class="rounded" />
            </td>
            {#each columns as column}
              <td class="px-4 py-3 text-sm text-foreground">
                {#if column.render}
                  {@const rendered = column.render(row)}
                  {#if typeof rendered === "string"}
                    {@html rendered}
                  {:else}
                    {rendered}
                  {/if}
                {:else}
                  {row[column.key]}
                {/if}
              </td>
            {/each}
            {#if actions.length > 0}
              {#each actions as action}
                <td class="px-4 py-3">
                  <button
                    onclick={() => action.onClick(row)}
                    class="inline-flex items-center"
                    aria-label={action.label}
                  >
                    <Icon
                      iconName={action.icon}
                      size={18}
                      class="text-muted-foreground cursor-pointer {action.variant ===
                      'destructive'
                        ? 'hover:text-destructive'
                        : 'hover:text-foreground'}"
                    />
                  </button>
                </td>
              {/each}
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Table Footer / Pagination -->
  {#if pagination}
    <div class="p-4 border-t border-border flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-sm text-muted-foreground">Row Per Page</span>
        <select
          class="px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
          value={pagination.rowsPerPage}
          onchange={(e) =>
            pagination.onRowsPerPageChange(Number(e.currentTarget.value))}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span class="text-sm text-muted-foreground">Entries</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="px-3 py-1 border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={pagination.currentPage === 1}
          onclick={() => pagination.onPageChange(pagination.currentPage - 1)}
        >
          <Icon iconName="icon/chevron-left" size={16} />
        </button>
        {#each Array(pagination.totalPages) as _, i}
          {@const page = i + 1}
          {#if page === 1 || page === pagination.totalPages || (page >= pagination.currentPage - 1 && page <= pagination.currentPage + 1)}
            <button
              class="px-3 py-1 border border-border rounded hover:bg-muted {page ===
              pagination.currentPage
                ? 'bg-info text-info-foreground'
                : ''}"
              onclick={() => pagination.onPageChange(page)}
            >
              {page}
            </button>
          {:else if page === pagination.currentPage - 2 || page === pagination.currentPage + 2}
            <span class="px-2 text-muted-foreground">...</span>
          {/if}
        {/each}
        <button
          class="px-3 py-1 border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={pagination.currentPage === pagination.totalPages}
          onclick={() => pagination.onPageChange(pagination.currentPage + 1)}
        >
          <Icon iconName="icon/chevron-right" size={16} />
        </button>
      </div>
    </div>
  {/if}
</div>
