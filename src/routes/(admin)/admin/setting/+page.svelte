<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";
  import { themeStore } from "$lib/stores/theme.svelte.js";

  const theme = $derived(themeStore.current.toLowerCase() as "light" | "dark" | "system");
  let language = $state("English");
  let notifications = $state(true);
  let twoFactor = $state(false);
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-foreground">Settings</h1>
    <p class="text-sm text-muted-foreground mt-1">Manage your admin preferences and security.</p>
  </div>

  <!-- Application Preferences -->
  <div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
    <div class="px-6 py-4 border-b border-border">
      <h2 class="font-semibold text-foreground">Application Preferences</h2>
    </div>
    <div class="divide-y divide-border">

      <!-- Theme -->
      <div class="px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center">
            <Icon iconName="icon/monitor" size={18} class="text-info" />
          </div>
          <div>
            <p class="text-sm font-medium text-foreground">Theme</p>
            <p class="text-xs text-muted-foreground">Choose your display theme</p>
          </div>
        </div>
        <div class="flex items-center gap-1 bg-muted rounded-lg p-1">
          {#each (["Light", "Dark", "System"] as const) as t}
            <button
              type="button"
              onclick={() => themeStore.set(t)}
              class="px-3 py-1.5 rounded-md text-xs font-medium transition-all {themeStore.current === t
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'}"
            >
              {t}
            </button>
          {/each}
        </div>
      </div>

      <!-- Language -->
      <div class="px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center">
            <Icon iconName="icon/languages" size={18} class="text-info" />
          </div>
          <div>
            <p class="text-sm font-medium text-foreground">Language</p>
            <p class="text-xs text-muted-foreground">Select your preferred language</p>
          </div>
        </div>
        <select
          bind:value={language}
          class="text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-info/20"
        >
          <option>English</option>
          <option>Amharic</option>
          <option>French</option>
        </select>
      </div>

      <!-- Notifications -->
      <div class="px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center">
            <Icon iconName="icon/bell" size={18} class="text-info" />
          </div>
          <div>
            <p class="text-sm font-medium text-foreground">Notifications</p>
            <p class="text-xs text-muted-foreground">Receive system alerts and updates</p>
          </div>
        </div>
        <button
          type="button"
          onclick={() => (notifications = !notifications)}
          class="relative w-11 h-6 rounded-full transition-colors {notifications ? 'bg-info' : 'bg-slate-200'}"
        >
          <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform {notifications ? 'translate-x-5' : 'translate-x-0'}"></span>
        </button>
      </div>
    </div>
  </div>

  <!-- Security -->
  <div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
    <div class="px-6 py-4 border-b border-border">
      <h2 class="font-semibold text-foreground">Security</h2>
    </div>
    <div class="divide-y divide-border">

      <!-- Change Password -->
      <div class="px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center">
            <Icon iconName="icon/lock" size={18} class="text-info" />
          </div>
          <div>
            <p class="text-sm font-medium text-foreground">Change Password</p>
            <p class="text-xs text-muted-foreground">Update your admin password</p>
          </div>
        </div>
        <button class="px-4 py-2 text-sm font-medium border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
          Change
        </button>
      </div>

      <!-- 2FA -->
      <div class="px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center">
            <Icon iconName="icon/shield-check" size={18} class="text-info" />
          </div>
          <div>
            <p class="text-sm font-medium text-foreground">Two-Factor Authentication</p>
            <p class="text-xs text-muted-foreground">Add an extra layer of security</p>
          </div>
        </div>
        <button
          type="button"
          onclick={() => (twoFactor = !twoFactor)}
          class="relative w-11 h-6 rounded-full transition-colors {twoFactor ? 'bg-info' : 'bg-slate-200'}"
        >
          <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform {twoFactor ? 'translate-x-5' : 'translate-x-0'}"></span>
        </button>
      </div>
    </div>
  </div>

  <!-- Support -->
  <div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
    <div class="px-6 py-4 border-b border-border">
      <h2 class="font-semibold text-foreground">Support</h2>
    </div>
    <div class="divide-y divide-border">
      <div class="px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center">
            <Icon iconName="icon/help-circle" size={18} class="text-info" />
          </div>
          <div>
            <p class="text-sm font-medium text-foreground">Help & Documentation</p>
            <p class="text-xs text-muted-foreground">View guides and FAQs</p>
          </div>
        </div>
        <button class="px-4 py-2 text-sm font-medium border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
          Open
        </button>
      </div>
      <div class="px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center">
            <Icon iconName="icon/send" size={18} class="text-info" />
          </div>
          <div>
            <p class="text-sm font-medium text-foreground">Contact Support</p>
            <p class="text-xs text-muted-foreground">Get help from the BamanStock team</p>
          </div>
        </div>
        <button class="px-4 py-2 text-sm font-medium border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
          Contact
        </button>
      </div>
    </div>
  </div>
</div>
