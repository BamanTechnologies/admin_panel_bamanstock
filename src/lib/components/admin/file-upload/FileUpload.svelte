<script lang="ts">
  import Icon from "$lib/components/ui/Icon/index.js";
  import { getAdminClient } from "$graphql/client";
  import UPLOAD_FILE from "$graphql/mutation/file/upload.gql";

  type UploadItem = {
    id: number;
    name: string;
    size: number;
    mime: string;
    url: string;
    status: "uploading" | "done" | "error";
    error?: string;
  };

  let {
    folder = "payments",
    maxFiles = 1,
    maxSizeMb = 10,
    disabled = false,
    label = "Attachment",
    hint = "",
    onChange = (_urls: string[]) => {},
  } = $props();

  let items = $state<UploadItem[]>([]);
  let dragging = $state(false);
  let error = $state<string | null>(null);
  let inputEl = $state<HTMLInputElement | null>(null);
  let replaceId = $state<number | null>(null);
  let nextId = 1;

  const maxSize = $derived(maxSizeMb * 1024 * 1024);
  const canAddMore = $derived(!disabled && items.length < maxFiles);

  function formatBytes(bytes: number): string {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  function readAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result ?? "");
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(new Error("The file could not be read."));
      reader.readAsDataURL(file);
    });
  }

  function emit() {
    onChange(items.filter((i) => i.status === "done" && i.url).map((i) => i.url));
  }

  async function upload(file: File, targetId: number | null) {
    if (file.size > maxSize) {
      error = `"${file.name}" is larger than ${maxSizeMb} MB.`;
      return;
    }

    const id = targetId ?? nextId++;
    const placeholder: UploadItem = {
      id,
      name: file.name,
      size: file.size,
      mime: file.type || "application/octet-stream",
      url: "",
      status: "uploading",
    };

    items =
      targetId === null
        ? [...items, placeholder]
        : items.map((i) => (i.id === targetId ? placeholder : i));
    error = null;

    try {
      const base64String = await readAsBase64(file);
      const result = await getAdminClient().mutate<{
        upload_files: { secure_url: string }[];
      }>({
        mutation: UPLOAD_FILE,
        variables: {
          files: [{ type: placeholder.mime, folder, base64String }],
        },
      });
      const secureUrl = result.data?.upload_files?.[0]?.secure_url ?? "";
      if (!secureUrl) throw new Error("The upload did not return a file URL.");
      items = items.map((i) =>
        i.id === id ? { ...i, url: secureUrl, status: "done" as const } : i
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "The file could not be uploaded.";
      items = items.map((i) =>
        i.id === id ? { ...i, status: "error" as const, error: message } : i
      );
      error = message;
    }
    emit();
  }

  function openPicker(targetId: number | null = null) {
    if (disabled) return;
    replaceId = targetId;
    inputEl?.click();
  }

  async function handleInputChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    input.value = "";
    if (!selected.length) return;

    const targetId = replaceId;
    replaceId = null;

    if (targetId !== null) {
      await upload(selected[0], targetId);
      return;
    }

    const room = Math.max(0, maxFiles - items.length);
    for (const file of selected.slice(0, room)) {
      await upload(file, null);
    }
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    if (disabled) return;

    const dropped = Array.from(e.dataTransfer?.files ?? []);
    if (!dropped.length) return;

    const targetId = replaceId;
    replaceId = null;

    if (targetId !== null) {
      await upload(dropped[0], targetId);
      return;
    }

    const room = Math.max(0, maxFiles - items.length);
    for (const file of dropped.slice(0, room)) {
      await upload(file, null);
    }
  }

  function removeItem(id: number) {
    items = items.filter((i) => i.id !== id);
    error = null;
    emit();
  }

  function isImage(item: UploadItem): boolean {
    return item.mime.startsWith("image/");
  }
</script>

<div class="flex flex-col gap-2">
  <span class="text-sm font-medium text-foreground">{label}</span>

  <!-- Uploaded files -->
  {#if items.length > 0}
    <div class="flex flex-col gap-2">
      {#each items as item (item.id)}
        <div
          class="flex items-center gap-3 rounded-lg border border-border bg-background px-2.5 py-2"
        >
          {#if item.status === "done" && isImage(item)}
            <img
              src={item.url}
              alt={item.name}
              class="h-11 w-11 rounded-md border border-border object-cover shrink-0"
            />
          {:else}
            <div
              class="h-11 w-11 rounded-md border border-border bg-muted flex items-center justify-center shrink-0"
            >
              <Icon
                iconName={isImage(item) ? "icon/image" : "icon/file-text"}
                size={18}
                class="text-muted-foreground"
              />
            </div>
          {/if}

          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-foreground truncate">{item.name}</p>
            {#if item.status === "uploading"}
              <p class="text-[11px] text-muted-foreground flex items-center gap-1">
                <Icon iconName="icon/refresh-cw" size={11} class="animate-spin" /> Uploading…
              </p>
            {:else if item.status === "error"}
              <p class="text-[11px] text-destructive truncate">{item.error}</p>
            {:else}
              <p class="text-[11px] text-muted-foreground truncate">
                {formatBytes(item.size)}
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  class="text-info hover:underline ml-1"
                >
                  Open
                </a>
              </p>
            {/if}
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onclick={() => openPicker(item.id)}
              disabled={disabled}
              class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
              aria-label="Change file"
              title="Change file"
            >
              <Icon iconName="icon/refresh-cw" size={15} />
            </button>
            <button
              type="button"
              onclick={() => removeItem(item.id)}
              disabled={disabled}
              class="p-1.5 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-30"
              aria-label="Remove file"
              title="Remove file"
            >
              <Icon iconName="icon/trash" size={15} />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Dropzone -->
  {#if canAddMore}
    <button
      type="button"
      onclick={() => openPicker()}
      ondragover={(e) => {
        e.preventDefault();
        dragging = true;
      }}
      ondragleave={() => (dragging = false)}
      ondrop={handleDrop}
      class="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-5 transition-colors {dragging
        ? 'border-info bg-info/5'
        : 'border-border bg-muted/30 hover:border-info hover:bg-info/5'}"
    >
      <Icon iconName="icon/upload-cloud" size={20} class="text-muted-foreground" />
      <span class="text-xs font-semibold text-foreground">
        {items.length ? "Add another file" : "Click to upload or drop a file here"}
      </span>
      <span class="text-[11px] text-muted-foreground">
        {hint || `PNG, JPG, PDF up to ${maxSizeMb} MB.`}
      </span>
    </button>
  {/if}

  <input
    bind:this={inputEl}
    type="file"
    class="hidden"
    onchange={handleInputChange}
    aria-hidden="true"
    tabindex="-1"
  />

  {#if error}
    <p class="text-xs text-destructive">{error}</p>
  {/if}
</div>
