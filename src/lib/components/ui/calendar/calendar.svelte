<script lang="ts">
  import { cn } from "$lib/utils.js";
  import Icon from "$lib/components/ui/Icon/index.js";

  interface CalendarProps {
    selected?: Date;
    onSelect?: (date: Date | undefined) => void;
    disabled?: boolean;
    class?: string;
    captionLayout?: "dropdown" | "dropdown-buttons" | "buttons";
    defaultMonth?: Date;
    minDate?: Date;
    maxDate?: Date;
  }

  let {
    selected,
    onSelect,
    disabled = false,
    class: className,
    captionLayout = "dropdown",
    defaultMonth,
    minDate,
    maxDate,
  }: CalendarProps = $props();

  let currentMonth = $state(
    defaultMonth
      ? new Date(defaultMonth.getFullYear(), defaultMonth.getMonth(), 1)
      : selected
        ? new Date(selected.getFullYear(), selected.getMonth(), 1)
        : new Date()
  );

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  function getDaysInMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  function getFirstDayOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  }

  function isDateDisabled(date: Date): boolean {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }

  function isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  function handleDateClick(day: number) {
    if (disabled) return;
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    if (isDateDisabled(date)) return;
    onSelect?.(date);
  }

  function previousMonth() {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    currentMonth = newDate;
  }

  function nextMonth() {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    currentMonth = newDate;
  }

  function setMonth(monthIndex: number) {
    const newDate = new Date(currentMonth);
    newDate.setMonth(monthIndex);
    currentMonth = newDate;
  }

  function setYear(year: number) {
    const newDate = new Date(currentMonth);
    newDate.setFullYear(year);
    currentMonth = newDate;
  }

  const daysInMonth = $derived(getDaysInMonth(currentMonth));
  const firstDay = $derived(getFirstDayOfMonth(currentMonth));
  const days = $derived(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  const yearOptions = $derived(
    Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 50 + i)
  );
</script>

<div class={cn("p-3", className)}>
  <div class="space-y-4">
    <!-- Header with month/year navigation -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={previousMonth}
          {disabled}
          class="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center disabled:opacity-50"
          aria-label="Previous month"
        >
          <Icon iconName="icon/chevron-left" size={16} />
        </button>
        <div class="flex items-center gap-1">
          {#if captionLayout === "dropdown" || captionLayout === "dropdown-buttons"}
            <select
              class="text-sm font-medium bg-transparent border-none outline-none cursor-pointer px-1"
              onchange={(e) => setMonth(Number(e.currentTarget.value))}
              {disabled}
            >
              {#each monthNames as month, i}
                <option value={i} selected={currentMonth.getMonth() === i}>
                  {month}
                </option>
              {/each}
            </select>
            <select
              class="text-sm font-medium bg-transparent border-none outline-none cursor-pointer px-1"
              onchange={(e) => setYear(Number(e.currentTarget.value))}
              {disabled}
            >
              {#each yearOptions as year}
                <option
                  value={year}
                  selected={currentMonth.getFullYear() === year}
                >
                  {year}
                </option>
              {/each}
            </select>
          {:else}
            <span class="text-sm font-medium">
              {monthNames[currentMonth.getMonth()]}
              {currentMonth.getFullYear()}
            </span>
          {/if}
        </div>
        <button
          type="button"
          onclick={nextMonth}
          {disabled}
          class="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center disabled:opacity-50"
          aria-label="Next month"
        >
          <Icon iconName="icon/chevron-right" size={16} />
        </button>
      </div>
    </div>

    <!-- Week day headers -->
    <div class="grid grid-cols-7 gap-1 mb-1">
      {#each weekDays as day}
        <div class="text-xs font-medium text-muted-foreground text-center w-9">
          {day}
        </div>
      {/each}
    </div>

    <!-- Calendar days -->
    <div class="grid grid-cols-7 gap-1">
      <!-- Empty cells for days before the first day of the month -->
      {#each Array(firstDay) as _}
        <div class="h-9 w-9"></div>
      {/each}

      <!-- Days of the month -->
      {#each days as day}
        {@const date = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth(),
          day
        )}
        {@const isSelected = selected && isSameDay(date, selected)}
        {@const isDisabled = isDateDisabled(date)}
        <button
          type="button"
          onclick={() => handleDateClick(day)}
          disabled={isDisabled || disabled}
          class={cn(
            "h-9 w-9 rounded-md text-sm font-normal transition-colors",
            isSelected
              ? "bg-info text-info-foreground hover:bg-info/90"
              : "hover:bg-muted",
            isDisabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {day}
        </button>
      {/each}
    </div>
  </div>
</div>
