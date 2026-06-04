<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";
  import { fade } from 'svelte/transition';
  import ResetPassword from "../../../../lib/components/admin/ResetPassword.svelte";
  import SuspendUser from "../../../../lib/components/admin/SuspendUser.svelte";

  let activeTab = $state("Investors");
  let selectedUser = $state<any>(null);

  // Modal visibility states
  let isResetModalOpen = $state(false);
  let isSuspendModalOpen = $state(false);

  // Mock data for the main list - populated to match Figma density
  let users = $state([
    { id: 1, name: "Richard Wilson", email: "rwilson@gmail.com", phone: "+123456789", date: "10 Dec 2024", status: "Active" },
    { id: 2, name: "Richard Wilson", email: "rwilson@gmail.com", phone: "+123456789", date: "10 Dec 2024", status: "Active" },
    { id: 3, name: "Richard Wilson", email: "rwilson@gmail.com", phone: "+123456789", date: "10 Dec 2024", status: "Active" },
    { id: 4, name: "Richard Wilson", email: "rwilson@gmail.com", phone: "+123456789", date: "10 Dec 2024", status: "Active" },
    { id: 5, name: "Richard Wilson", email: "rwilson@gmail.com", phone: "+123456789", date: "10 Dec 2024", status: "Active" },
    { id: 6, name: "Richard Wilson", email: "rwilson@gmail.com", phone: "+123456789", date: "10 Dec 2024", status: "Active" },
    { id: 7, name: "Richard Wilson", email: "rwilson@gmail.com", phone: "+123456789", date: "10 Dec 2024", status: "Active" },
    { id: 8, name: "Richard Wilson", email: "rwilson@gmail.com", phone: "+123456789", date: "10 Dec 2024", status: "Active" },
    { id: 9, name: "Richard Wilson", email: "rwilson@gmail.com", phone: "+123456789", date: "10 Dec 2024", status: "Active" },
    { id: 10, name: "Richard Wilson", email: "rwilson@gmail.com", phone: "+123456789", date: "10 Dec 2024", status: "Active" },
  ]);

  const investorStats = [
    { label: "Total Merchant", value: "27", change: "-20% vs Last Month", icon: "icon/user", color: "text-cyan-500", bg: "bg-cyan-50" },
    { label: "Revenue Generated", value: "$21,450", change: "+41% vs Last Month", icon: "icon/bar-chart", color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Total Stock Sold", value: "1,700", change: "+41% vs Last Month", icon: "icon/box", color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Active Locations", value: "1,700", change: "+41% vs Last Month", icon: "icon/map-pin", color: "text-rose-500", bg: "bg-rose-50" },
  ];

  const merchantStats = [
    { label: "Total Sales Revenue", value: "$21,450", change: "+41% vs Last Month", icon: "icon/bar-chart", color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Total Transaction", value: "1,406", change: "-20% vs Last Month", icon: "icon/dollar-sign", color: "text-cyan-500", bg: "bg-cyan-50" },
    { label: "Total Stock Sold", value: "1,700", change: "+41% vs Last Month", icon: "icon/box", color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Outstanding Credit", value: "$3,890", change: "+41% vs Last Month", icon: "icon/credit-card", color: "text-orange-500", bg: "bg-orange-50" },
  ];

  function handleResetConfirm() {
    isResetModalOpen = false;
  }

  function handleSuspendConfirm() {
    isSuspendModalOpen = false;
  }
</script>

{#if !selectedUser}
  <div class="space-y-6" in:fade>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-8">
        {#each ["Investors", "Merchants"] as tab}
          <button onclick={() => activeTab = tab} class="relative pb-2 text-sm font-bold {activeTab === tab ? 'text-[#4D8DEE]' : 'text-muted-foreground'}">
            {tab}
            {#if activeTab === tab}<div class="absolute bottom-0 left-0 w-full h-0.5 bg-[#4D8DEE] rounded-full"></div>{/if}
          </button>
        {/each}
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground shadow-sm">
          <Icon iconName="icon/calendar" size={16} />
          <span>01 Jan 2024 - 07 Jan 2024</span>
        </div>
        <button class="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2 text-sm font-bold text-foreground shadow-sm">
          <Icon iconName="icon/file-text" size={16} class="text-red-500" /> Export
        </button>
      </div>
    </div>

    <div class="bg-card border border-border rounded-2xl shadow-sm min-h-[500px]">
      <div class="p-4 border-b border-border flex items-center justify-between">
        <div class="relative w-80">
          <Icon iconName="icon/search" size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search" class="w-full bg-muted border border-border rounded-xl py-2 pl-10 pr-4 text-sm" />
        </div>
        <div class="flex gap-2">
          <button class="px-3 py-2 border border-border rounded-xl text-sm font-medium text-muted-foreground flex items-center gap-2">Location <Icon iconName="icon/chevron-down" size={14} /></button>
          <button class="px-3 py-2 border border-border rounded-xl text-sm font-medium text-muted-foreground flex items-center gap-2">Status <Icon iconName="icon/chevron-down" size={14} /></button>
        </div>
      </div>

      <table class="w-full text-sm">
        <thead class="bg-muted/80 text-muted-foreground font-bold uppercase text-[11px] tracking-wider">
          <tr>
            <th class="px-6 py-4 w-10"><input type="checkbox" class="rounded border-slate-300" /></th>
            <th class="px-6 py-4 text-left">Name <Icon iconName="icon/arrow-down" size={12} class="inline opacity-50" /></th>
            <th class="px-6 py-4 text-left">Email</th>
            <th class="px-6 py-4 text-left">Phone Number</th>
            <th class="px-6 py-4 text-left">Created At <Icon iconName="icon/arrow-down" size={12} class="inline opacity-50" /></th>
            <th class="px-6 py-4 text-left">Status</th>
            <th class="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          {#each users as user}
            <tr class="hover:bg-muted/50">
              <td class="px-6 py-4"><input type="checkbox" class="rounded border-slate-300" /></td>
              <td class="px-6 py-4 font-bold flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-info/10 flex items-center justify-center flex-shrink-0">
                  <Icon iconName="icon/user" size={16} class="text-info" />
                </div> {user.name}
              </td>
              <td class="px-6 py-4 text-muted-foreground">{user.email}</td>
              <td class="px-6 py-4 text-muted-foreground">{user.phone}</td>
              <td class="px-6 py-4 text-muted-foreground">{user.date}</td>
              <td class="px-6 py-4">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-600 flex items-center gap-1.5 w-fit">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {user.status}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <button onclick={() => selectedUser = user} class="p-1.5 text-muted-foreground hover:text-blue-500"><Icon iconName="icon/eye" size={16} /></button>
                <button class="p-1.5 text-muted-foreground hover:text-blue-500"><Icon iconName="icon/user" size={16} /></button>
                <button class="p-1.5 text-muted-foreground hover:text-rose-500"><Icon iconName="icon/trash" size={16} /></button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      
      <div class="p-4 border-t border-border flex items-center justify-between text-muted-foreground text-sm">
        <div class="flex items-center gap-2">
          Row Per Page 
          <select class="bg-muted border border-border rounded px-2 py-1 outline-none">
            <option>10</option>
          </select>
          Entries
        </div>
        <div class="flex items-center gap-1">
          <button class="p-1 hover:text-blue-600"><Icon iconName="icon/chevron-left" size={16} /></button>
          <button class="w-6 h-6 flex items-center justify-center rounded-full text-xs">1</button>
          <button class="w-6 h-6 flex items-center justify-center rounded-full text-xs">2</button>
          <button class="w-6 h-6 flex items-center justify-center rounded-full text-xs">3</button>
          <button class="w-6 h-6 flex items-center justify-center rounded-full bg-blue-600 text-white text-xs">4</button>
          <span class="px-1">...</span>
          <button class="w-6 h-6 flex items-center justify-center rounded-full text-xs">15</button>
          <button class="p-1 hover:text-blue-600"><Icon iconName="icon/chevron-right" size={16} /></button>
        </div>
      </div>
    </div>
  </div>

{:else}
  <div class="space-y-6" in:fade>
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold text-foreground">
        {activeTab === 'Investors' ? 'Investor Detail' : 'Merchant Detail'}
      </h2>
    </div>

    <button onclick={() => selectedUser = null} class="flex items-center gap-2 text-muted-foreground font-medium hover:text-foreground transition-colors">
      <Icon iconName="icon/arrow-left" size={20} /> Back to Users
    </button>

    <div class="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="w-20 h-20 rounded-2xl bg-info/10 flex items-center justify-center flex-shrink-0">
          <Icon iconName="icon/user" size={36} class="text-info" />
        </div>
        <div>
          <h3 class="text-xl font-bold text-foreground">{activeTab === 'Merchants' ? 'Beth Richard' : selectedUser.name}</h3>
          <div class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>ID: #NV920</span>
            <span class="flex items-center gap-1 text-emerald-500">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
            </span>
          </div>
        </div>
      </div>

      <div class="flex gap-3">
        <button onclick={() => isResetModalOpen = true} class="px-4 py-2 border border-info text-info text-sm font-bold rounded-lg hover:bg-blue-50">
          Reset Password
        </button>
        <button onclick={() => isSuspendModalOpen = true} class="px-4 py-2 bg-rose-500 text-white text-sm font-bold rounded-lg hover:bg-rose-600">
          {activeTab === 'Investors' ? 'Suspend Account' : 'Suspend Merchant'}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      {#each (activeTab === 'Investors' ? investorStats : merchantStats) as stat}
        <div class="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-2xl font-bold text-foreground">{stat.value}</p>
              <p class="text-xs font-medium text-muted-foreground">{stat.label}</p>
            </div>
            <div class="{stat.bg} {stat.color} p-3 rounded-xl">
              <Icon iconName={stat.icon as any} size={22} />
            </div>
          </div>
          <p class="text-xs font-bold pt-4 border-t border-border {stat.change.includes('+') ? 'text-emerald-500' : 'text-rose-500'}">
            {stat.change}
          </p>
        </div>
      {/each}
    </div>

    <div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      {#if activeTab === 'Investors'}
        <div class="p-6 border-b border-border flex justify-between items-center">
          <h3 class="font-bold text-foreground">Merchants Managed</h3>
          <div class="flex gap-2">
            <button class="px-3 py-1.5 border border-border rounded-lg text-xs font-medium flex items-center gap-2">Location <Icon iconName="icon/chevron-down" size={12} /></button>
            <button class="px-3 py-1.5 border border-border rounded-lg text-xs font-medium flex items-center gap-2">Status <Icon iconName="icon/chevron-down" size={12} /></button>
          </div>
        </div>
        <table class="w-full text-sm">
          <thead class="bg-muted/80 text-muted-foreground text-[11px] uppercase font-bold">
            <tr>
              <th class="px-6 py-4 w-10"><input type="checkbox" class="rounded border-slate-300" /></th>
              <th class="px-6 py-4 text-left">Merchant <Icon iconName="icon/arrow-down" size={12} class="inline" /></th>
              <th class="px-6 py-4 text-left">Revenue <Icon iconName="icon/arrow-down" size={12} class="inline" /></th>
              <th class="px-6 py-4 text-left">Transactions</th>
              <th class="px-6 py-4 text-left">Location</th>
              <th class="px-6 py-4 text-left">Status <Icon iconName="icon/arrow-down" size={12} class="inline" /></th>
              <th class="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            {#each Array(8) as _, i}
              <tr class="text-muted-foreground hover:bg-muted/50">
                <td class="px-6 py-4"><input type="checkbox" class="rounded border-slate-300" /></td>
                <td class="px-6 py-4 font-medium flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-info/10 flex items-center justify-center flex-shrink-0">
                    <Icon iconName="icon/user" size={12} class="text-info" />
                  </div> Richard Wilson
                </td>
                <td class="px-6 py-4 font-bold text-foreground">$156,900</td>
                <td class="px-6 py-4">785</td>
                <td class="px-6 py-4">Branch #2</td>
                <td class="px-6 py-4">
                  {#if i === 0}
                    <span class="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-muted-foreground font-bold uppercase">Invited</span>
                  {:else if i === 2}
                    <span class="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-500 font-bold uppercase">Declined</span>
                  {:else}
                    <span class="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-600 font-bold uppercase">Active</span>
                  {/if}
                </td>
                <td class="px-6 py-4 text-right">
                  <button class="text-muted-foreground px-1 hover:text-blue-500"><Icon iconName="icon/eye" size={16} /></button>
                  <button class="text-muted-foreground px-1 hover:text-rose-500"><Icon iconName="icon/trash" size={16} /></button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <div class="p-6 space-y-6">
          <div class="flex justify-between items-start">
            <div class="space-y-1">
              <p class="text-sm font-medium text-muted-foreground">Revenue Over Time</p>
              <p class="text-3xl font-bold text-foreground">$690,237.90</p>
              <p class="text-xs font-bold text-muted-foreground">Last 12 Months <span class="text-emerald-500">+15.2%</span></p>
            </div>
            <div class="flex border border-border rounded-lg overflow-hidden bg-muted">
              {#each ['1D', '1W', '1M', '3M', '6M', '1Y'] as range}
                <button class="px-3 py-1.5 text-[10px] font-bold {range === '1Y' ? 'bg-blue-500 text-white' : 'text-muted-foreground hover:bg-slate-100'}">{range}</button>
              {/each}
            </div>
          </div>
          <div class="h-64 w-full bg-gradient-to-t from-blue-50/50 to-transparent relative rounded-xl flex items-end justify-between px-2">
             <svg class="absolute inset-0 w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
                <path d="M0,150 Q100,140 200,130 T400,160 T600,140 T800,110 T1000,140" fill="none" stroke="#3b82f6" stroke-width="3" />
                <circle cx="800" cy="110" r="6" fill="#3b82f6" stroke="white" stroke-width="2" />
             </svg>
             {#each ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as month}
                <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pb-2 z-10">{month}</span>
             {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<ResetPassword bind:isOpen={isResetModalOpen} onConfirm={handleResetConfirm} />
<SuspendUser bind:isOpen={isSuspendModalOpen} userName={selectedUser?.name} onConfirm={handleSuspendConfirm} />