<script lang="ts">
  import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarInset,
    SidebarTrigger,
  } from "$lib/components/ui/sidebar/index.js";
  import Icon from "$lib/components/ui/Icon/index.js";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { themeStore } from "$lib/stores/theme.svelte.js";
  import { authStore } from "$lib/stores/auth.svelte.js";
  import { useAdminProfile } from "$lib/stores/profile.svelte.js";

  let { children } = $props();

  $effect(() => { themeStore.init(); });

  const profile = useAdminProfile();
  let loggingOut = $state(false);

  function toggleTheme() {
    themeStore.set(themeStore.current === "Dark" ? "Light" : "Dark");
  }

  async function handleLogout() {
    if (loggingOut) return;
    loggingOut = true;
    authStore.logout();
    await goto("/admin/login", { replaceState: true });
  }

  const adminNavigation = [
    { title: "Dashboard",    icon: "icon/layout-grid",  href: "/admin/dashboard" },
    { title: "Users",        icon: "icon/users",        href: "/admin/users" },
    { title: "Activity Log", icon: "icon/activity",     href: "/admin/activity" },
    { title: "Subscription", icon: "icon/credit-card",  href: "/admin/subscription" },
    { title: "Setting",      icon: "icon/settings",     href: "/admin/setting" },
  ];
</script>

<SidebarProvider>
  <div class="flex min-h-screen w-full bg-background">
    <Sidebar>
      <SidebarHeader>
        <div class="flex items-center gap-2 px-4 py-2">
          <div class="w-10 h-10 rounded-xl bg-info flex items-center justify-center">
            <Icon iconName="icon/trending-up" size={20} class="text-info-foreground" />
          </div>
          <span class="text-xl font-bold text-info">BAMANSTOCK</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu class="gap-1 px-2">
              {#each adminNavigation as item}
                <SidebarMenuItem>
                  <a href={item.href} class="block">
                    <SidebarMenuButton
                      isActive={$page.url.pathname === item.href}
                      class="px-4 py-6 rounded-lg transition-all"
                    >
                      <Icon iconName={item.icon as any} size={20} />
                      <span class="font-medium">{item.title}</span>
                    </SidebarMenuButton>
                  </a>
                </SidebarMenuItem>
              {/each}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter class="p-4">
        <button
          type="button"
          onclick={handleLogout}
          disabled={loggingOut}
          class="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-900/20 rounded-lg transition-colors disabled:opacity-60"
        >
          <Icon iconName="icon/log-out" size={20} />
          <span class="font-medium">{loggingOut ? "Logging out..." : "Logout"}</span>
        </button>
      </SidebarFooter>
    </Sidebar>

    <SidebarInset>
      <header class="flex h-16 shrink-0 items-center justify-between px-6 bg-background border-b border-border">
        <div class="flex items-center gap-4 flex-1">
          <SidebarTrigger />
          <div class="relative hidden md:block w-full max-w-md">
            <Icon iconName="icon/search" size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search"
              class="w-full rounded-full border border-border bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-border"
            />
          </div>
        </div>

        <div class="flex items-center gap-4">
          <Icon iconName="icon/bell"     size={20} class="text-muted-foreground cursor-pointer hover:text-foreground" />
          <Icon iconName="icon/settings" size={20} class="text-muted-foreground cursor-pointer hover:text-foreground" />

          <button
            type="button"
            onclick={toggleTheme}
            aria-label="Toggle theme"
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {#if themeStore.current === "Dark"}
              <Icon iconName="icon/sun" size={18} />
            {:else}
              <Icon iconName="icon/moon" size={18} />
            {/if}
          </button>

          <div class="w-6 h-4 rounded-sm bg-blue-600 border border-border flex items-center justify-center">
            <span class="text-[7px] font-bold text-white leading-none">EN</span>
          </div>

          <div class="flex items-center gap-3 pl-2 pr-1">
            <div class="hidden sm:block text-right leading-tight">
              <p class="text-sm font-bold text-foreground truncate max-w-[160px]">
                {profile.name || 'Administrator'}
              </p>
              <p class="text-[11px] font-medium text-muted-foreground truncate max-w-[160px]">
                {authStore.user?.role ?? ''}
              </p>
            </div>
            <div
              class="w-9 h-9 rounded-full bg-info/10 border-2 border-border flex items-center justify-center overflow-hidden shrink-0"
              title={profile.email || profile.name}
            >
              {#if profile.avatar}
                <img src={profile.avatar} alt={profile.name} class="w-full h-full object-cover" />
              {:else}
                <span class="text-xs font-bold text-info">{profile.initials}</span>
              {/if}
            </div>
          </div>
        </div>
      </header>

      <main class="p-6 md:p-8">
        {@render children()}
      </main>
    </SidebarInset>
  </div>
</SidebarProvider>
