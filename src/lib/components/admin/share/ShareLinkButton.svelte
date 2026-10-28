<script lang="ts">
  import { toast } from "svelte-sonner";
  import Icon from "$lib/components/ui/Icon/index.js";
  import {
    Button,
    type ButtonSize,
    type ButtonVariant,
  } from "$lib/components/ui/button/index.js";
  import {
    copyText,
    shareLink,
    uploadPdf,
    type ShareTarget,
  } from "$lib/share/index.js";

  type Props = {
    /** Renders the document and returns its bytes. */
    getBytes: () => Promise<Uint8Array>;
    /** Text that travels with the shared link. */
    message: string;
    label?: string;
    folder?: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    iconOnly?: boolean;
    placement?: "top" | "bottom";
    class?: string;
    title?: string;
  };

  let {
    getBytes,
    message,
    label = "Share link",
    folder = "invoices",
    variant = "outline",
    size = "default",
    iconOnly = false,
    placement = "top",
    class: className = "",
    title = "Share",
  }: Props = $props();

  const targets: {
    id: ShareTarget;
    label: string;
    icon: "icon/send" | "icon/message-circle";
    accent: string;
  }[] = [
    {
      id: "telegram",
      label: "Telegram",
      icon: "icon/send",
      accent: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300",
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: "icon/message-circle",
      accent:
        "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
  ];

  let root = $state<HTMLDivElement | null>(null);
  let open = $state(false);
  let loading = $state(false);
  let url = $state("");
  let copied = $state<ShareTarget | null>(null);

  $effect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (root && !root.contains(event.target as Node)) open = false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") open = false;
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  });

  async function prepare() {
    if (loading) return;
    open = false;
    loading = true;
    copied = null;
    try {
      url = await uploadPdf(await getBytes(), folder);
      open = true;
    } catch (e) {
      url = "";
      toast.error(
        e instanceof Error ? e.message : "The PDF could not be shared."
      );
    } finally {
      loading = false;
    }
  }

  function toggle() {
    if (loading) return;
    if (open) {
      open = false;
      return;
    }
    if (url) open = true;
    else void prepare();
  }

  async function copy(target: ShareTarget) {
    if (!url) return;
    const targetLabel = targets.find((t) => t.id === target)?.label ?? "Share";
    try {
      await copyText(shareLink(target, url, message));
      copied = target;
      toast.success(`${targetLabel} link copied to clipboard`);
    } catch {
      toast.error("The link could not be copied.");
    }
  }

  const menuPosition = $derived(
    placement === "top" ? "bottom-full right-0 mb-2" : "top-full right-0 mt-2"
  );

  // A new document means the cached upload is stale.
  let lastMessage: string | null = null;
  $effect(() => {
    const current = message;
    if (lastMessage !== null && lastMessage !== current) {
      url = "";
      open = false;
      copied = null;
    }
    lastMessage = current;
  });
</script>

<div class="relative inline-block" bind:this={root}>
  <Button
    {variant}
    {size}
    type="button"
    onclick={toggle}
    disabled={loading}
    aria-haspopup="menu"
    aria-expanded={open}
    {title}
    class={className}
  >
    {#if loading}
      <Icon iconName="icon/refresh-cw" size={16} class="animate-spin" />
      {#if !iconOnly}Preparing link…{/if}
    {:else}
      <Icon iconName="icon/share-2" size={16} />
      {#if !iconOnly}{label}{/if}
    {/if}
  </Button>

  {#if open && url}
    <div
      class="absolute {menuPosition} z-30 w-64 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg p-1.5"
      role="menu"
    >
      <div class="px-2.5 pt-1.5 pb-2">
        <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Share link
        </p>
        <p class="text-[11px] text-muted-foreground mt-0.5">
          Pick an app to copy the share link.
        </p>
      </div>

      {#each targets as target (target.id)}
        <button
          type="button"
          role="menuitem"
          onclick={() => copy(target.id)}
          class="w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-muted transition-colors"
        >
          <span
            class="w-9 h-9 rounded-full {target.accent} flex items-center justify-center shrink-0"
          >
            <Icon iconName={target.icon} size={16} />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold text-foreground">{target.label}</span>
            <span class="block text-[11px] text-muted-foreground">
              {copied === target.id ? "Copied to clipboard" : "Copy share link"}
            </span>
          </span>
          <Icon
            iconName={copied === target.id ? "icon/check" : "icon/copy"}
            size={15}
            class={copied === target.id ? "text-emerald-500" : "text-muted-foreground"}
          />
        </button>
      {/each}
    </div>
  {/if}
</div>
