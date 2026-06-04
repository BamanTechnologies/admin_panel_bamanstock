<script lang="ts">
  import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "$lib/components/ui/popover/index.js";
  import { Calendar } from "$lib/components/ui/calendar/index.js";
  import Icon from "$lib/components/ui/Icon/index.js";
  import { cn } from "$lib/utils.js";

  interface DatePickerProps {
    value?: Date;
    onSelect?: (date: Date | undefined) => void;
    placeholder?: string;
    label?: string;
    id?: string;
    disabled?: boolean;
    minDate?: Date;
    maxDate?: Date;
    class?: string;
  }

  let {
    value = $bindable(undefined),
    onSelect,
    placeholder = "MM/DD/YYYY",
    label,
    id,
    disabled = false,
    minDate,
    maxDate,
    class: className,
  }: DatePickerProps = $props();

  let open = $state(false);

  function formatDate(date: Date | undefined): string {
    if (!date) return "";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  function handleSelect(date: Date | undefined) {
    value = date;
    onSelect?.(date);
    open = false;
  }
</script>

<div class={cn("space-y-2", className)}>
  {#if label}
    <label for={id} class="text-sm font-medium text-foreground">
      {label}
    </label>
  {/if}
  <Popover bind:open>
    <PopoverTrigger
      {id}
      {disabled}
      class={cn(
        "relative w-full text-left",
        "h-9 px-3 py-2 pl-10",
        "border border-input rounded-md bg-background text-sm",
        "focus:outline-none focus:ring-2 focus:ring-info focus:ring-offset-1",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "cursor-pointer",
        !value && "text-muted-foreground"
      )}
    >
      <Icon
        iconName="icon/calendar"
        size={16}
        class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <span>{value ? formatDate(value) : placeholder}</span>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar
        selected={value}
        onSelect={handleSelect}
        captionLayout="dropdown"
        defaultMonth={value}
        {minDate}
        {maxDate}
      />
    </PopoverContent>
  </Popover>
</div>
