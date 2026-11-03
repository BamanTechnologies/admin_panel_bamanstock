<script lang="ts">
  import { Dropdown } from "$lib/components/ui/dropdown/index.js";
  import { DatePicker } from "$lib/components/ui/date-picker/index.js";
  import { GROUP_OPTIONS, type GroupPeriod } from "./period.js";

  let {
    group = $bindable(),
    startDate = $bindable(),
    endDate = $bindable(),
  }: { group: GroupPeriod; startDate: Date; endDate: Date } = $props();
</script>

<div class="flex flex-wrap items-center gap-2">
  <Dropdown
    options={GROUP_OPTIONS}
    value={group}
    onchange={(v) => (group = v as GroupPeriod)}
    containerClass="w-28"
  />
  <DatePicker
    value={startDate}
    onSelect={(d) => d && (startDate = d)}
    maxDate={endDate}
    class="w-36"
  />
  <span class="text-xs text-muted-foreground">to</span>
  <DatePicker
    value={endDate}
    onSelect={(d) => d && (endDate = d)}
    minDate={startDate}
    class="w-36"
  />
</div>
