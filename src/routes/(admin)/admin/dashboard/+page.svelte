<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";

  const stats = [
    { label: "Total Investors", value: "95", change: "-19%", trend: "down", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/40", icon: "icon/users" },
    { label: "Total Merchant", value: "2891", change: "+35%", trend: "up", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-100 dark:bg-cyan-900/40", icon: "icon/user" },
    { label: "Total Revenue", value: "$29,350.89", change: "-19%", trend: "down", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-green-100 dark:bg-green-900/40", icon: "icon/bar-chart" },
    { label: "System Status", value: "Healthy", change: "+41%", trend: "up", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/40", icon: "icon/activity" }
  ];

  const activities = [
    { id: "1", title: "Merchant Suspended", desc: "Merchant ID #19302 violated TOS", time: "1m", icon: "icon/user-minus", iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600 dark:text-blue-400" },
    { id: "2", title: "Subscription Upgraded", desc: "Sarah J. switched to Pro Plan", time: "1m", icon: "icon/trending-up", iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600 dark:text-blue-400" },
    { id: "3", title: "New User Registration", desc: "Mike Ross joined as Merchant", time: "1m", icon: "icon/user-plus", iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600 dark:text-blue-400" },
    { id: "4", title: "Invoice Generated", desc: "Invoice #NV0293 sent to a client", time: "1m", icon: "icon/file-text", iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600 dark:text-blue-400" }
  ];
</script>

<div class="space-y-6 p-2">
  <div class="flex items-center justify-between mb-8">
    <h2 class="text-2xl font-semibold text-foreground">Welcome, Alex</h2>
    <div class="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
      <Icon iconName="icon/calendar" size={14} />
      <span>01 Jan 2024 - 07 Jan 2024</span>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {#each stats as stat}
      <div class="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between min-h-[140px]">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-xl font-bold text-foreground leading-tight">{stat.value}</p>
            <p class="text-[13px] text-muted-foreground mt-1 font-normal">{stat.label}</p>
          </div>
          <div class="{stat.bg} {stat.color} p-2.5 rounded-lg">
            <Icon iconName={stat.icon as any} size={20} />
          </div>
        </div>
 
        <div class="mt-4 pt-4 border-t border-border flex items-center gap-1">
          <span class="text-xs font-bold {stat.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}">
            {stat.change}
          </span>
          <span class="text-xs text-muted-foreground">vs Last Month</span>
        </div>
      </div>
    {/each}
  </div>

  <div class="bg-card rounded-xl border border-border shadow-sm overflow-hidden mt-8">
    <div class="px-6 py-4 border-b border-border flex justify-between items-center">
      <h3 class="text-base font-bold text-foreground">Recent Activity</h3>
      <button class="text-xs font-bold text-info hover:text-blue-600">View All</button>
    </div>
    
    <div class="divide-y divide-slate-50">
      {#each activities as activity}
        <div class="px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
          <div class="flex items-center gap-4">
            <div class="{activity.iconBg} {activity.iconColor} w-10 h-10 rounded-lg flex items-center justify-center">
              <Icon iconName={activity.icon as any} size={18} />
            </div>
            <div>
              <h4 class="text-sm font-bold text-foreground leading-tight">{activity.title}</h4>
              <p class="text-xs text-muted-foreground mt-0.5">{activity.desc}</p>
            </div>
          </div>
          <span class="text-xs font-medium text-blue-400">{activity.time}</span>
        </div>
      {/each}
    </div>
  </div>
</div>