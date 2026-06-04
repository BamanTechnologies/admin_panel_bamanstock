<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";
  import { cn } from "$lib/utils.js";
  import { onDestroy } from "svelte";
  import { browser } from "$app/environment";

  interface DropdownOption {
    value: string;
    label: string;
    disabled?: boolean;
  }

  interface DropdownProps {
    id?: string;
    label?: string;
    options: DropdownOption[];
    value?: string | number;
    placeholder?: string;
    disabled?: boolean;
    class?: string;
    containerClass?: string;
    onchange?: (value: string) => void;
  }

  let {
    id,
    label,
    options,
    value = $bindable(""),
    placeholder = "Select...",
    disabled = false,
    class: className,
    containerClass,
    onchange,
  }: DropdownProps = $props();

  const stringValue = $derived(String(value || ""));

  let isOpen = $state(false);
  let dropdownRef = $state<HTMLDivElement | undefined>(undefined);

  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
      isOpen = false;
      if (browser) document.removeEventListener("click", handleClickOutside);
    }
  }

  function toggleDropdown() {
    if (disabled || !browser) return;
    isOpen = !isOpen;
    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
    } else {
      document.removeEventListener("click", handleClickOutside);
    }
  }

  function selectOption(optionValue: string) {
    if (!disabled) {
      value = optionValue;
      isOpen = false;
      if (browser) document.removeEventListener("click", handleClickOutside);
      onchange?.(optionValue);
    }
  }

  onDestroy(() => {
    if (browser) document.removeEventListener("click", handleClickOutside);
  });

  const selectedOption = $derived(options.find((opt) => opt.value === stringValue));
  const displayText = $derived(selectedOption?.label || placeholder);
</script>

<div bind:this={dropdownRef} class={cn("relative", containerClass)}>
  {#if label}
    <label for={id} class="text-sm font-medium text-foreground mb-2 block">
      {label}
    </label>
  {/if}
  <button
    {id}
    type="button"
    {disabled}
    onclick={toggleDropdown}
    class={cn(
      "flex items-center justify-between gap-2 w-full px-3 py-2 h-9 bg-background border border-input rounded-md text-sm text-foreground transition-colors",
      "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-info focus:ring-offset-1",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      className
    )}
    aria-expanded={isOpen}
    aria-haspopup="listbox"
  >
    <span class="truncate text-left flex-1">{displayText}</span>
    <Icon
      iconName="icon/chevron-down"
      size={16}
      class={cn("text-muted-foreground transition-transform shrink-0", isOpen ? "rotate-180" : "")}
    />
  </button>

  {#if isOpen && !disabled}
    <div
      class="absolute top-full left-0 mt-1 w-full bg-background border border-input rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
      role="listbox"
    >
      {#each options as option}
        <button
          type="button"
          role="option"
          aria-selected={stringValue === option.value}
          disabled={option.disabled}
          class={cn(
            "w-full text-left px-4 py-2 text-sm transition-colors hover:bg-muted",
            stringValue === option.value ? "bg-muted font-medium" : "",
            option.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          )}
          onclick={() => selectOption(option.value)}
        >
          {option.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
