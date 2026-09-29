<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";
  import { page } from "$app/stores";
  import { fade } from "svelte/transition";
  import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";
  import ResetPassword from "$lib/components/admin/ResetPassword.svelte";
  import RegisterUser from "$lib/components/admin/RegisterUser.svelte";
  import { getAdminClient } from "$graphql/client";
  import LIST_USERS from "$graphql/queries/users/list.gql";
  import BULK_DELETE_USERS from "$graphql/mutation/users/bulk_delete.gql";
  import TOGGLE_USERS from "$graphql/mutation/users/toggle_activation.gql";
  import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, buildPageList } from "$lib/pagination";

  type UserRow = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
    profile_picture?: string | null;
    is_active: boolean;
    created_at: string;
    roles?: { role: string }[];
  };

  type SortKey = "first_name" | "last_name" | "phone" | "created_at" | "is_active";

  const SORTABLE: Record<string, { label: string; key: SortKey }> = {
    name: { label: "Name", key: "first_name" },
    phone: { label: "Phone Number", key: "phone" },
    created_at: { label: "Created At", key: "created_at" },
    is_active: { label: "Status", key: "is_active" },
  };

  let tab = $state<"investor" | "merchant" | "all">("all");
  let status = $state<"active" | "inactive" | "all">("all");
  let search = $state("");
  let sortKey = $state<SortKey>("created_at");
  let sortDir = $state<"asc" | "desc">("desc");
  let pageNumber = $state(1);
  let limit = $state<number>(DEFAULT_PAGE_SIZE);

  let users = $state<UserRow[]>([]);
  let total = $state(0);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let selectedIds = $state<string[]>([]);
  let searchDebounce: ReturnType<typeof setTimeout>;

  let confirmDeleteOpen = $state(false);
  let confirmToggleOpen = $state(false);
  let isResetModalOpen = $state(false);
  let isRegisterOpen = $state(false);
  let confirmActionLoading = $state(false);
  let confirmError = $state<string | null>(null);

  let pendingIds = $state<string[]>([]);
  let pendingActivate = $state(false);
  let actionLabel = $derived(pendingActivate ? "Activate" : "Deactivate");

  function seedFromUrl() {
    const p = new URLSearchParams($page.url.search);
    tab = p.get("tab") === "investor" ? "investor" : p.get("tab") === "merchant" ? "merchant" : "all";
    status =
      p.get("status") === "active" ? "active" : p.get("status") === "inactive" ? "inactive" : "all";
    search = p.get("q") ?? "";
    const limitNum = Number(p.get("limit"));
    limit = PAGE_SIZE_OPTIONS.includes(limitNum as (typeof PAGE_SIZE_OPTIONS)[number]) ? limitNum : DEFAULT_PAGE_SIZE;
    sortKey = Object.values(SORTABLE).some((c) => c.key === p.get("sort"))
      ? (p.get("sort") as SortKey)
      : "created_at";
    sortDir = p.get("dir") === "asc" ? "asc" : "desc";
    pageNumber = Math.max(1, Number(p.get("page")) || 1);
  }

  function toUrlParams(): URLSearchParams {
    const p = new URLSearchParams();
    if (tab !== "all") p.set("tab", tab);
    if (status !== "all") p.set("status", status);
    if (search.trim()) p.set("q", search.trim());
    p.set("page", String(pageNumber));
    p.set("limit", String(limit));
    p.set("sort", sortKey);
    p.set("dir", sortDir);
    return p;
  }

  function syncToUrl() {
    const next = toUrlParams().toString();
    const current = new URLSearchParams(window.location.search).toString();
    if (next !== current) {
      history.replaceState(history.state, "", `?${next}`);
    }
    loadData();
  }

  function handleSearchInput() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      pageNumber = 1;
      selectedIds = [];
      syncToUrl();
    }, 400);
  }

  function handleStatusChange(e: Event) {
    status = (e.currentTarget as HTMLSelectElement).value as typeof status;
    pageNumber = 1;
    selectedIds = [];
    syncToUrl();
  }

  function handleTab(next: "investor" | "merchant" | "all") {
    if (tab === next) return;
    tab = next;
    pageNumber = 1;
    selectedIds = [];
    syncToUrl();
  }

  function handleSort(label: string) {
    const entry = Object.values(SORTABLE).find((c) => c.label === label);
    if (!entry) return;
    if (entry.key === sortKey) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortKey = entry.key;
      sortDir = "asc";
    }
    pageNumber = 1;
    syncToUrl();
  }

  function handleLimitChange(e: Event) {
    limit = Number((e.currentTarget as HTMLSelectElement).value) || DEFAULT_PAGE_SIZE;
    pageNumber = 1;
    syncToUrl();
  }

  function goToPage(p: number) {
    pageNumber = p;
    syncToUrl();
  }

  function buildFilter(): Record<string, unknown> {
    const conditions: Record<string, unknown>[] = [];
    if (search.trim()) {
      conditions.push({
        _or: [
          { first_name: { _ilike: `%${search.trim()}%` } },
          { last_name: { _ilike: `%${search.trim()}%` } },
          { phone: { _ilike: `%${search.trim()}%` } },
          { email: { _ilike: `%${search.trim()}%` } },
        ],
      });
    }
    if (status !== "all") conditions.push({ is_active: { _eq: status === "active" } });
    if (tab !== "all") conditions.push({ user_roles: { role: { _eq: tab } } });
    return conditions.length > 0 ? { _and: conditions } : {};
  }

  async function loadData() {
    loading = true;
    error = null;
    try {
      const client = getAdminClient();
      const result = await client.query<{
        account_users: UserRow[];
        total: { aggregate: { count: number } };
      }>({
        query: LIST_USERS,
        variables: {
          filter: buildFilter(),
          limit,
          offset: (pageNumber - 1) * limit,
          order: [{ [sortKey]: sortDir }],
        },
      });
      users = result.data?.account_users ?? [];
      total = result.data?.total?.aggregate?.count ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      if (pageNumber > totalPages && total > 0) {
        pageNumber = totalPages;
        syncToUrl();
        return;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load users.";
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void $page.url;
    loadData();
  });

  seedFromUrl();

  const totalPages = $derived(Math.max(1, Math.ceil(total / limit)));
  const pageStart = $derived(total === 0 ? 0 : (pageNumber - 1) * limit + 1);
  const pageEnd = $derived(Math.min(pageNumber * limit, total));
  const shown = $derived(users.filter((u) => selectedIds.includes(u.id)));
  const allOnPageSelected = $derived(users.length > 0 && users.every((u) => selectedIds.includes(u.id)));
  const toggleTarget = $derived(shown.length > 0 ? shown.some((u) => !u.is_active) : false);

  function toggleAll() {
    if (allOnPageSelected) {
      selectedIds = selectedIds.filter((id) => !users.some((u) => u.id === id));
    } else {
      const pageIds = users.map((u) => u.id);
      selectedIds = Array.from(new Set([...selectedIds, ...pageIds]));
    }
  }

  function formatDate(iso: string): string {
    if (!iso) return "—";
    try {
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  function fullName(u: UserRow): string {
    return `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "—";
  }

  function initials(u: UserRow): string {
    const parts = [u.first_name, u.last_name].filter(Boolean);
    return parts.map((p) => p!.charAt(0)).join("").slice(0, 2).toUpperCase() || "?";
  }

  // Bulk / row actions
  function openDelete(ids: string[]) {
    pendingIds = ids;
    confirmError = null;
    confirmDeleteOpen = true;
  }

  function openToggle(ids: string[], activate: boolean) {
    pendingIds = ids;
    pendingActivate = activate;
    confirmError = null;
    confirmToggleOpen = true;
  }

  function pendingLabel(): string {
    if (pendingIds.length > 1) return `${pendingIds.length} selected users`;
    const u = users.find((x) => x.id === pendingIds[0]);
    return u ? fullName(u) : "this user";
  }

  async function confirmDelete() {
    confirmActionLoading = true;
    confirmError = null;
    try {
      await getAdminClient().mutate({
        mutation: BULK_DELETE_USERS,
        variables: { ids: pendingIds },
      });
      confirmDeleteOpen = false;
      selectedIds = [];
      loadData();
    } catch (e) {
      confirmError = e instanceof Error ? e.message : "Failed to delete.";
    } finally {
      confirmActionLoading = false;
    }
  }

  async function confirmToggle() {
    confirmActionLoading = true;
    confirmError = null;
    try {
      await getAdminClient().mutate({
        mutation: TOGGLE_USERS,
        variables: { ids: pendingIds, toggle: pendingActivate },
      });
      confirmToggleOpen = false;
      selectedIds = [];
      loadData();
    } catch (e) {
      confirmError = e instanceof Error ? e.message : "Failed to update.";
    } finally {
      confirmActionLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Users — BamanStock</title>
</svelte:head>

<div class="space-y-6" in:fade>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-8">
      <button
        onclick={() => handleTab("all")}
        class="relative pb-2 text-sm font-bold {tab === 'all' ? 'text-[#4D8DEE]' : 'text-muted-foreground'}"
      >
        All
        {#if tab === 'all'}<div class="absolute bottom-0 left-0 w-full h-0.5 bg-[#4D8DEE] rounded-full"></div>{/if}
      </button>
      {#each ["investor", "merchant"] as t}
        <button
          onclick={() => handleTab(t as "investor" | "merchant")}
          class="relative pb-2 text-sm font-bold capitalize {tab === t ? 'text-[#4D8DEE]' : 'text-muted-foreground'}"
        >
          {t}s
          {#if tab === t}<div class="absolute bottom-0 left-0 w-full h-0.5 bg-[#4D8DEE] rounded-full"></div>{/if}
        </button>
      {/each}
    </div>
    <div class="flex items-center gap-3">
      <button
        onclick={() => { isRegisterOpen = true; }}
        class="flex items-center gap-2 bg-[#4D8DEE] text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm hover:opacity-90"
      >
        <Icon iconName="icon/plus" size={16} /> Register User
      </button>
      <button class="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2 text-sm font-bold text-foreground shadow-sm">
        <Icon iconName="icon/file-text" size={16} class="text-red-500" /> Export
      </button>
    </div>
  </div>

  <div class="bg-card border border-border rounded-2xl shadow-sm min-h-[500px] relative overflow-hidden">
    {#if loading && users.length > 0}
      <div class="absolute top-0 left-0 right-0 h-0.5 bg-info/20 overflow-hidden">
        <div class="h-full w-full origin-left animate-[loadbar_1.2s_ease-in-out_infinite] bg-[#4D8DEE]"></div>
      </div>
    {/if}

    <div class="p-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
      <div class="relative w-80">
        <Icon iconName="icon/search" size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, phone or email"
          bind:value={search}
          oninput={handleSearchInput}
          class="w-full bg-muted border border-border rounded-xl py-2 pl-10 pr-4 text-sm"
        />
      </div>
      <div class="flex gap-2 items-center">
        {#if selectedIds.length > 0}
          <span class="px-3 py-2 text-sm font-bold text-foreground">{selectedIds.length} selected</span>
          <button
            onclick={() => { openToggle(selectedIds, toggleTarget); }}
            class="px-3 py-2 border border-border rounded-xl text-sm font-medium text-foreground flex items-center gap-2 hover:bg-muted"
          >
            <Icon iconName="icon/check" size={14} />
            {toggleTarget ? "Activate" : "Deactivate"}
          </button>
          <button
            onclick={() => { openDelete(selectedIds); }}
            class="px-3 py-2 border border-rose-200 rounded-xl text-sm font-medium text-rose-600 flex items-center gap-2 hover:bg-rose-50"
          >
            <Icon iconName="icon/trash" size={14} />
            Delete
          </button>
        {/if}
        <select
          value={status}
          onchange={handleStatusChange}
          class="px-3 py-2 border border-border rounded-xl text-sm font-medium text-muted-foreground bg-card outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
    </div>

    <table class="w-full text-sm">
      <thead class="bg-muted/80 text-muted-foreground font-bold uppercase text-[11px] tracking-wider">
        <tr>
          <th class="px-6 py-4 w-10">
            <input
              type="checkbox"
              checked={allOnPageSelected}
              onchange={toggleAll}
              class="rounded border-slate-300"
            />
          </th>
          <th class="px-6 py-4 text-left cursor-pointer select-none" onclick={() => handleSort("Name")}>
            Name
            <Icon iconName={sortKey === 'first_name' ? (sortDir === 'asc' ? 'icon/arrow-up' : 'icon/arrow-down') : 'icon/chevron-up'} size={12} class="inline opacity-50" />
          </th>
          <th class="px-6 py-4 text-left">Email</th>
          <th class="px-6 py-4 text-left cursor-pointer select-none" onclick={() => handleSort("Phone Number")}>
            Phone Number
            <Icon iconName={sortKey === 'phone' ? (sortDir === 'asc' ? 'icon/arrow-up' : 'icon/arrow-down') : 'icon/chevron-up'} size={12} class="inline opacity-50" />
          </th>
          <th class="px-6 py-4 text-left">Roles</th>
          <th class="px-6 py-4 text-left cursor-pointer select-none" onclick={() => handleSort("Created At")}>
            Created At
            <Icon iconName={sortKey === 'created_at' ? (sortDir === 'asc' ? 'icon/arrow-up' : 'icon/arrow-down') : 'icon/chevron-up'} size={12} class="inline opacity-50" />
          </th>
          <th class="px-6 py-4 text-left cursor-pointer select-none" onclick={() => handleSort("Status")}>
            Status
            <Icon iconName={sortKey === 'is_active' ? (sortDir === 'asc' ? 'icon/arrow-up' : 'icon/arrow-down') : 'icon/chevron-up'} size={12} class="inline opacity-50" />
          </th>
          <th class="px-6 py-4 text-right">Action</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-50">
        {#if loading && users.length === 0}
          {#each Array(6) as _, i}
            <tr class="animate-pulse">
              <td class="px-6 py-4"><div class="w-4 h-4 rounded bg-muted"></div></td>
              <td class="px-6 py-4"><div class="w-8 h-8 rounded-full bg-muted"></div><div class="w-32 h-3 mt-1 rounded bg-muted"></div></td>
              <td class="px-6 py-4"><div class="w-36 h-3 rounded bg-muted"></div></td>
              <td class="px-6 py-4"><div class="w-28 h-3 rounded bg-muted"></div></td>
              <td class="px-6 py-4"><div class="w-20 h-3 rounded bg-muted"></div></td>
              <td class="px-6 py-4"><div class="w-24 h-3 rounded bg-muted"></div></td>
              <td class="px-6 py-4"><div class="w-16 h-3 rounded bg-muted"></div></td>
              <td class="px-6 py-4"><div class="w-16 h-3 ml-auto rounded bg-muted"></div></td>
            </tr>
          {/each}
        {:else if users.length === 0}
          <tr>
            <td colspan="8" class="px-6 py-16 text-center">
              {#if error}
                <Icon iconName="icon/alert-circle" size={24} class="text-rose-500 inline mr-2" />
                <span class="text-muted-foreground">Failed to load users — {error}</span>
              {:else}
                <Icon iconName="icon/users" size={24} class="text-muted-foreground inline mr-2" />
                <span class="text-muted-foreground">No users found.</span>
              {/if}
            </td>
          </tr>
        {:else}
          {#each users as u}
            <tr class="hover:bg-muted/50 {selectedIds.includes(u.id) ? 'bg-info/5' : ''}">
              <td class="px-6 py-4">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(u.id)}
                  onchange={() => {
                    selectedIds = selectedIds.includes(u.id)
                      ? selectedIds.filter((id) => id !== u.id)
                      : [...selectedIds, u.id];
                  }}
                  class="rounded border-slate-300"
                />
              </td>
              <td class="px-6 py-4 font-bold flex items-center gap-3">
                {#if u.profile_picture}
                  <img src={u.profile_picture} alt={fullName(u)} class="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                {:else}
                  <div class="w-8 h-8 rounded-full bg-info/10 flex items-center justify-center flex-shrink-0">
                    <span class="text-[10px] font-bold text-info">{initials(u)}</span>
                  </div>
                {/if}
                {fullName(u)}
              </td>
              <td class="px-6 py-4 text-muted-foreground">{u.email ?? "—"}</td>
              <td class="px-6 py-4 text-muted-foreground">{u.phone ?? "—"}</td>
              <td class="px-6 py-4">
                <div class="flex flex-wrap gap-1">
                  {#each u.roles ?? [] as r}
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-muted-foreground">{r.role}</span>
                  {/each}
                </div>
              </td>
              <td class="px-6 py-4 text-muted-foreground">{formatDate(u.created_at)}</td>
              <td class="px-6 py-4">
                {#if u.is_active}
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-600 flex items-center gap-1.5 w-fit">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                  </span>
                {:else}
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-500 flex items-center gap-1.5 w-fit">
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Inactive
                  </span>
                {/if}
              </td>
              <td class="px-6 py-4 text-right">
                <button
                  title="Reset password"
                  onclick={() => { isResetModalOpen = true; }}
                  class="p-1.5 text-muted-foreground hover:text-blue-500"
                >
                  <Icon iconName="icon/refresh-cw" size={16} />
                </button>
                <button
                  title={u.is_active ? "Deactivate" : "Activate"}
                  onclick={() => { openToggle([u.id], !u.is_active); }}
                  class="p-1.5 text-muted-foreground hover:text-blue-500"
                >
                  <Icon iconName="icon/user" size={16} />
                </button>
                <button
                  title="Delete"
                  onclick={() => { openDelete([u.id]); }}
                  class="p-1.5 text-muted-foreground hover:text-rose-500"
                >
                  <Icon iconName="icon/trash" size={16} />
                </button>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>

    <div class="p-4 border-t border-border flex items-center justify-between text-muted-foreground text-sm flex-wrap gap-3">
      <div class="flex items-center gap-2">
        Row Per Page
        <select
          value={limit}
          onchange={handleLimitChange}
          class="bg-muted border border-border rounded px-2 py-1 outline-none"
        >
          {#each PAGE_SIZE_OPTIONS as sizeOption}
            <option value={sizeOption}>{sizeOption}</option>
          {/each}
        </select>
        <span>{total === 0 ? "0 entries" : `Showing ${pageStart}–${pageEnd} of ${total} entries`}</span>
      </div>
      {#if totalPages > 1}
        <div class="flex items-center gap-1">
          <button
            onclick={() => goToPage(Math.max(1, pageNumber - 1))}
            disabled={pageNumber === 1}
            class="p-1 hover:text-blue-600 disabled:opacity-30"
            aria-label="Previous page"
          >
            <Icon iconName="icon/chevron-left" size={16} />
          </button>
          {#each buildPageList(pageNumber, totalPages) as p}
            {#if p === "…"}
              <span class="px-1 text-xs">…</span>
            {:else}
              <button
                onclick={() => goToPage(p)}
                class={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${
                  p === pageNumber ? "bg-[#4D8DEE] text-white" : "hover:bg-muted"
                }`}
              >
                {p}
              </button>
            {/if}
          {/each}
          <button
            onclick={() => goToPage(Math.min(totalPages, pageNumber + 1))}
            disabled={pageNumber === totalPages}
            class="p-1 hover:text-blue-600 disabled:opacity-30"
            aria-label="Next page"
          >
            <Icon iconName="icon/chevron-right" size={16} />
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<ConfirmModal
  bind:isOpen={confirmDeleteOpen}
  title="Delete user"
  icon="icon/trash"
  message={`Are you sure you want to delete <strong>${pendingLabel()}</strong>? This action cannot be undone.`}
  error={confirmError}
  confirmText="Delete"
  loading={confirmActionLoading}
  onConfirm={confirmDelete}
/>
<ConfirmModal
  bind:isOpen={confirmToggleOpen}
  title={actionLabel}
  icon={pendingActivate ? "icon/check" : "icon/alert-triangle"}
  iconClass={pendingActivate ? "bg-emerald-500/10" : "bg-destructive/10"}
  iconColorClass={pendingActivate ? "text-emerald-600" : "text-destructive"}
  confirmClass={pendingActivate ? "bg-emerald-600 text-white hover:bg-emerald-700 min-w-[100px]" : "bg-red-600 text-white hover:bg-red-700 min-w-[100px]"}
  message={`Are you sure you want to <strong>${pendingActivate ? "activate" : "deactivate"}</strong> ${pendingLabel()}?`}
  error={confirmError}
  confirmText={actionLabel}
  loading={confirmActionLoading}
  onConfirm={confirmToggle}
/>
<ResetPassword bind:isOpen={isResetModalOpen} onConfirm={() => { isResetModalOpen = false; }} />
<RegisterUser bind:isOpen={isRegisterOpen} onSuccess={() => loadData()} />

<style>
  @keyframes loadbar {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }
</style>