<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";
  import { getAdminClient } from "$graphql/client";
  import ROLES from "$graphql/queries/roles/roles.gql";

  type RoleRow = { role: string };

  let {
    roles = $bindable([] as string[]),
    placeholder = "Select roles...",
    exclude = [] as string[],
    locked = [] as string[],
  } = $props();

  let searchText = $state("");
  let apiRoles = $state<RoleRow[]>([]);
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
      const result = await getAdminClient().query<{ account_roles: RoleRow[] }>({
        query: ROLES,
        variables: { filter, limit: 50, offset: 0 },
      });
      apiRoles = result.data?.account_roles ?? [];
    } catch {
      apiRoles = [];
    } finally {
      loading = false;
    }
  }

  const visibleRoles = $derived(
    apiRoles.filter((r) => !exclude.includes(r.role))
  );

  function buildFilter(search: string): Record<string, unknown> {
    if (!search.trim()) return {};
    return { role: { _ilike: `%${search.trim()}%` } };
  }

  function handleInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      await load(buildFilter(searchText));
      isOpen = true;
    }, 300);
  }

  function handleFocus() {
    if (apiRoles.length === 0) {
      load({}).then(() => { isOpen = true; });
    } else {
      isOpen = true;
    }
  }

  function toggle(role: string) {
    if (locked.includes(role)) return;
    const next = new Set(roles);
    if (next.has(role)) next.delete(role);
    else next.add(role);
    roles = Array.from(next);
  }

  const lockedSet = $derived(new Set(locked));
  const selectedMap = $derived(new Set(roles));

  $effect(() => {
    for (const r of locked) {
      if (!roles.includes(r)) roles = [...roles, r];
    }
  });

  $effect(() => {
    load(buildFilter(""));
    return () => clearTimeout(debounceTimer);
  });
</script>

<div bind:this={containerRef} class="relative min-w-[220px]">
  {#if roles.length > 0}
    <div class="flex flex-wrap gap-1.5 mb-1.5">
      {#each roles as role}
        <span class="inline-flex items-center gap-1 rounded-full bg-info/10 text-info px-2.5 py-1 text-xs font-medium">
          {role}
          {#if !lockedSet.has(role)}
            <button
              type="button"
              aria-label={`Remove ${role}`}
              class="hover:text-foreground transition-colors"
              onclick={() => toggle(role)}
            >
              <Icon iconName="icon/x" size={12} />
            </button>
          {/if}
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
      placeholder={roles.length ? "Add role..." : placeholder}
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
      {:else if visibleRoles.length === 0}
        <div class="px-3 py-2 text-sm text-muted-foreground">No roles found</div>
      {:else}
        {#each visibleRoles as row}
          <button
            type="button"
            onclick={() => toggle(row.role)}
            class="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer flex items-center justify-between"
          >
            <span>{row.role}</span>
            {#if selectedMap.has(row.role)}
              <Icon iconName="icon/check" size={14} class="text-info shrink-0" />
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>