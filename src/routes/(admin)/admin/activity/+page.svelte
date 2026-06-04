<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";
  import { fade } from 'svelte/transition';

  // State for filtering [cite: 2]
  let searchQuery = $state("");
  let actionType = $state("All");
  let actorRole = $state("All");
  let dateRange = $state("01 Jan 2024 - 07 Jan 2024");

  // Mock data based on the Figma design [cite: 3, 4, 5]
  const activityLogs = $state([
    { 
      id: 1, 
      dateTime: "2024-07-22 10:45 AM", 
      type: "Update", 
      description: "Change stock quantity from 45 to 50", 
      userRole: "Merchant", 
      performedBy: "Jane Smith" 
    },
    { 
      id: 2, 
      dateTime: "2024-07-22 10:45 AM", 
      type: "Update", 
      description: "Change stock quantity from 45 to 50", 
      userRole: "Merchant", 
      performedBy: "Jane Smith" 
    },
    { 
      id: 3, 
      dateTime: "2024-07-22 10:45 AM", 
      type: "Update", 
      description: "Change stock quantity from 45 to 50", 
      userRole: "Merchant", 
      performedBy: "Jane Smith" 
    },
    { 
      id: 4, 
      dateTime: "2024-07-22 10:45 AM", 
      type: "Update", 
      description: "Change stock quantity from 45 to 50", 
      userRole: "Merchant", 
      performedBy: "Jane Smith" 
    }
  ]);
</script>

<div class="p-8 space-y-6" in:fade>
  <div class="flex items-center justify-between mb-8">
    <h2 class="text-xl font-bold text-foreground">Activity Log</h2>
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 text-[13px] text-muted-foreground shadow-sm">
        <Icon iconName="icon/calendar" size={16} />
        <span>{dateRange}</span>
      </div>
      <button class="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-1.5 text-[13px] font-bold text-foreground shadow-sm hover:bg-muted transition-colors">
        <Icon iconName="icon/file-text" size={16} class="text-red-500" />
        Export
      </button>
    </div>
  </div>

  <div class="bg-card border border-border rounded-xl p-8 shadow-sm">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="relative flex items-center">
        <Icon iconName="icon/search" size={18} class="absolute left-4 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Search" 
          bind:value={searchQuery}
          class="w-full bg-card border border-border rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10" 
        />
      </div>

      <div class="space-y-2">
        <label for="actionType" class="text-[13px] font-medium text-muted-foreground">Action Type</label>
        <div class="relative">
          <select id="actionType" bind:value={actionType} class="w-full appearance-none bg-card border border-border rounded-xl py-2.5 px-4 text-sm text-foreground focus:outline-none">
            <option>All</option>
            <option>Update</option>
          </select>
          <Icon iconName="icon/chevron-down" size={14} class="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      <div class="space-y-2">
        <label for="actorRole" class="text-[13px] font-medium text-muted-foreground">Actor Role</label>
        <div class="relative">
          <select id="actorRole" bind:value={actorRole} class="w-full appearance-none bg-card border border-border rounded-xl py-2.5 px-4 text-sm text-foreground focus:outline-none">
            <option>All</option>
            <option>Merchant</option>
          </select>
          <Icon iconName="icon/chevron-down" size={14} class="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      <div class="space-y-2">
        <label for="dateRangeFilter" class="text-[13px] font-medium text-muted-foreground">Date Range</label>
        <button id="dateRangeFilter" class="w-full flex items-center gap-2 bg-card border border-border rounded-xl py-2.5 px-4 text-sm text-muted-foreground">
          <Icon iconName="icon/calendar" size={16} class="text-muted-foreground" />
          <span>{dateRange}</span>
        </button>
      </div>
    </div>
  </div>

  <div class="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
    <table class="w-full">
      <thead class="bg-muted/50 border-b border-border">
        <tr>
          <th class="px-8 py-5 text-left text-[13px] font-bold text-foreground">Date/Time</th>
          <th class="px-8 py-5 text-left text-[13px] font-bold text-foreground">Type</th>
          <th class="px-8 py-5 text-left text-[13px] font-bold text-foreground">Description</th>
          <th class="px-8 py-5 text-left text-[13px] font-bold text-foreground">User Role</th>
          <th class="px-8 py-5 text-left text-[13px] font-bold text-foreground">Performed By</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-50">
        {#each activityLogs as log (log.id)}
          <tr class="hover:bg-muted/30 transition-colors">
            <td class="px-8 py-6 text-[13px] text-muted-foreground">{log.dateTime}</td>
            <td class="px-8 py-6 text-[13px]">
              <span class="inline-flex items-center gap-2 text-blue-500 font-semibold">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                {log.type}
              </span>
            </td>
            <td class="px-8 py-6 text-[13px] text-muted-foreground">{log.description}</td>
            <td class="px-8 py-6 text-[13px] text-muted-foreground">{log.userRole}</td>
            <td class="px-8 py-6 text-[13px] font-medium text-foreground">{log.performedBy}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    
    {#if activityLogs.length === 0}
      <div class="flex flex-col items-center justify-center py-20 bg-card">
        <h3 class="text-lg font-bold text-foreground">No logs found</h3>
        <p class="text-muted-foreground text-sm">Try adjusting your filters to see more results.</p>
      </div>
    {/if}
  </div>
</div>