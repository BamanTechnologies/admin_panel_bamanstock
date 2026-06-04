<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";
  import { fade } from 'svelte/transition';

  // State management
  let searchQuery = $state("");
  let itemsPerPage = $state(10);
  let currentPage = $state(4); // Match the screenshot's active page

  // Mock data representing the table in the screenshot
  let subscriptions = $state([
    { id: 1, planType: "Premium", appliedTo: "Richard Wilson", role: "Merchant", price: "$29/month", status: "Active", expireDate: "10 Dec 2024" },
    { id: 2, planType: "Business", appliedTo: "Richard Wilson", role: "Merchant", price: "$29/month", status: "Active", expireDate: "10 Dec 2024" },
    { id: 3, planType: "Gold", appliedTo: "Richard Wilson", role: "Merchant", price: "$29/month", status: "Active", expireDate: "10 Dec 2024" },
    { id: 4, planType: "Premium", appliedTo: "Richard Wilson", role: "Merchant", price: "$29/month", status: "Active", expireDate: "10 Dec 2024" },
    { id: 5, planType: "Business", appliedTo: "Richard Wilson", role: "Merchant", price: "$29/month", status: "Active", expireDate: "10 Dec 2024" },
    { id: 6, planType: "Gold", appliedTo: "Richard Wilson", role: "Merchant", price: "$29/month", status: "Active", expireDate: "10 Dec 2024" },
    { id: 7, planType: "Premium", appliedTo: "Richard Wilson", role: "Merchant", price: "$29/month", status: "Active", expireDate: "10 Dec 2024" },
    { id: 8, planType: "Business", appliedTo: "Richard Wilson", role: "Merchant", price: "$29/month", status: "Active", expireDate: "10 Dec 2024" },
    { id: 9, planType: "Gold", appliedTo: "Richard Wilson", role: "Merchant", price: "$29/month", status: "Active", expireDate: "10 Dec 2024" },
    { id: 10, planType: "Business", appliedTo: "Richard Wilson", role: "Merchant", price: "$29/month", status: "Active", expireDate: "10 Dec 2024" },
  ]);

</script>

<div class="space-y-6" in:fade>
  <div class="flex items-center justify-between">
    <h2 class="text-2xl font-bold text-foreground">Subscription Plan</h2>
    
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground shadow-sm">
        <Icon iconName="icon/calendar" size={16} />
        <span>01 Jan 2024 - 07 Jan 2024</span>
      </div>
      <button class="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2 text-sm font-bold text-foreground shadow-sm hover:bg-muted transition-colors">
        <Icon iconName="icon/file-text" size={16} class="text-red-500" /> Export
      </button>
    </div>
  </div>

  <div class="bg-card border border-border rounded-2xl shadow-sm min-h-[500px] flex flex-col">
    <div class="p-4 border-b border-border flex items-center justify-between">
      <div class="relative w-80">
        <Icon iconName="icon/search" size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input 
          bind:value={searchQuery}
          type="text" 
          placeholder="Search" 
          class="w-full bg-card border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10" 
        />
      </div>
      <div class="flex gap-2">
        <button class="px-3 py-2 border border-border rounded-xl text-sm font-medium text-muted-foreground flex items-center gap-2 bg-card hover:bg-muted">
          Plan Type <Icon iconName="icon/chevron-down" size={14} />
        </button>
        <button class="px-3 py-2 border border-border rounded-xl text-sm font-medium text-muted-foreground flex items-center gap-2 bg-card hover:bg-muted">
          Status <Icon iconName="icon/chevron-down" size={14} />
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-muted/80 text-muted-foreground font-bold uppercase text-[11px] tracking-wider">
          <tr>
            <th class="px-6 py-4 w-10"><input type="checkbox" class="rounded border-slate-300" /></th>
            <th class="px-6 py-4 text-left">Plan Type</th>
            <th class="px-6 py-4 text-left">Applied To <Icon iconName="icon/arrow-down" size={12} class="inline opacity-50" /></th>
            <th class="px-6 py-4 text-left">Role <Icon iconName="icon/arrow-down" size={12} class="inline opacity-50" /></th>
            <th class="px-6 py-4 text-left">Price</th>
            <th class="px-6 py-4 text-left">Status</th>
            <th class="px-6 py-4 text-left">Expire Date <Icon iconName="icon/arrow-down" size={12} class="inline opacity-50" /></th>
            <th class="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          {#each subscriptions as sub}
            <tr class="hover:bg-muted/50 transition-colors">
              <td class="px-6 py-4"><input type="checkbox" class="rounded border-slate-300" /></td>
              <td class="px-6 py-4 text-muted-foreground">{sub.planType}</td>
              <td class="px-6 py-4 font-bold flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-info/10 flex items-center justify-center flex-shrink-0">
                  <Icon iconName="icon/user" size={16} class="text-info" />
                </div> {sub.appliedTo}
              </td>
              <td class="px-6 py-4 text-muted-foreground">{sub.role}</td>
              <td class="px-6 py-4 text-muted-foreground">{sub.price}</td>
              <td class="px-6 py-4">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-600 flex items-center gap-1.5 w-fit">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {sub.status}
                </span>
              </td>
              <td class="px-6 py-4 text-muted-foreground">{sub.expireDate}</td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-1">
                  <button class="p-1.5 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors">
                    <Icon iconName="icon/eye" size={16} />
                  </button>
                  <button class="p-1.5 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors">
                    <Icon iconName="icon/user" size={16} />
                  </button>
                  <button class="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors">
                    <Icon iconName="icon/trash" size={16} />
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="p-4 border-t border-border flex items-center justify-between text-xs font-medium text-muted-foreground">
      <div class="flex items-center gap-2">
        <span>Row Per Page</span>
        <select bind:value={itemsPerPage} class="border border-border rounded-lg px-2 py-1 bg-card focus:outline-none">
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        <span class="ml-2">Entries</span>
      </div>

      <div class="flex items-center gap-1">
        <button class="p-1 hover:bg-slate-100 rounded text-muted-foreground"><Icon iconName="icon/chevron-left" size={14} /></button>
        {#each [1, 2, 3, 4] as pageNum}
          <button 
            onclick={() => currentPage = pageNum}
            class="w-7 h-7 flex items-center justify-center rounded-full transition-colors {currentPage === pageNum ? 'bg-blue-500 text-white' : 'hover:bg-slate-100 text-muted-foreground'}"
          >
            {pageNum}
          </button>
        {/each}
        <span class="px-1">...</span>
        <button 
            onclick={() => currentPage = 15}
            class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        >
          15
        </button>
        <button class="p-1 hover:bg-slate-100 rounded text-muted-foreground"><Icon iconName="icon/chevron-right" size={14} /></button>
      </div>
    </div>
  </div>
</div>