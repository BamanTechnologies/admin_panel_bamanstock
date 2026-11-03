<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import Icon from "$lib/components/ui/Icon/index.js";
  import { getAdminClient } from "$graphql/client";
  import INSERT_BRANCH from "$graphql/mutation/branches/insert.gql";
  import UPDATE_BRANCH from "$graphql/mutation/branches/update.gql";

  type BranchRow = {
    id: string;
    name: string;
    address: string;
  };

  let {
    isOpen = $bindable(false),
    companyId = "",
    branch = null as BranchRow | null,
    onSuccess = () => {},
    onClose = () => {},
  } = $props();

  let name = $state("");
  let address = $state("");
  let loading = $state(false);
  let error = $state<string | null>(null);
  let isEditing = $derived(!!branch);

  $effect(() => {
    if (isOpen) {
      error = null;
      name = branch?.name ?? "";
      address = branch?.address ?? "";
    }
  });

  function handleClose() {
    if (loading) return;
    isOpen = false;
    name = "";
    address = "";
    error = null;
    onClose();
  }

  async function handleSubmit() {
    if (loading) return;
    if (!name.trim()) {
      error = "Branch name is required.";
      return;
    }
    if (!address.trim()) {
      error = "Branch address is required.";
      return;
    }
    error = null;
    loading = true;
    try {
      const client = getAdminClient();
      if (branch) {
        await client.mutate({
          mutation: UPDATE_BRANCH,
          variables: { id: branch.id, set: { name: name.trim(), address: address.trim() } },
        });
      } else {
        await client.mutate({
          mutation: INSERT_BRANCH,
          variables: {
            object: { name: name.trim(), address: address.trim(), company: companyId },
          },
        });
      }
      isOpen = false;
      name = "";
      address = "";
      onSuccess();
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to save branch.";
    } finally {
      loading = false;
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    onclick={loading ? undefined : handleClose}
    role="dialog"
    aria-modal="true"
    aria-labelledby="branch-form-title"
  >
    <div
      class="bg-card rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="flex items-center justify-between p-6 border-b border-border">
        <h2 id="branch-form-title" class="text-xl font-bold text-foreground">
          {isEditing ? "Edit Branch" : "Add Branch"}
        </h2>
        <button
          type="button"
          class="p-1 rounded-md hover:bg-muted transition-colors disabled:opacity-30"
          onclick={handleClose}
          disabled={loading}
          aria-label="Close modal"
        >
          <Icon iconName="icon/x" size={20} class="text-foreground" />
        </button>
      </div>

      <form
        novalidate
        class="p-6 flex flex-col gap-4"
        onsubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {#if error}
          <div class="p-3 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-2 text-left">
            <Icon iconName="icon/alert-circle" size={16} class="text-destructive shrink-0 mt-0.5" />
            <p class="text-sm text-destructive break-words">{error}</p>
          </div>
        {/if}

        <div class="flex flex-col gap-1.5">
          <label for="branch-name" class="text-sm font-medium text-foreground">
            Branch name <span class="text-destructive">*</span>
          </label>
          <input
            id="branch-name"
            type="text"
            bind:value={name}
            placeholder="Branch name"
            class="h-9 px-3 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="branch-address" class="text-sm font-medium text-foreground">
            Address <span class="text-destructive">*</span>
          </label>
          <textarea
            id="branch-address"
            rows="3"
            bind:value={address}
            placeholder="Branch address"
            class="px-3 py-2 border border-border rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border resize-none"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Button
            variant="outline"
            type="button"
            onclick={handleClose}
            disabled={loading}
            class="border-border text-foreground hover:bg-muted"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {#if loading}
              <Icon iconName="icon/refresh-cw" size={16} class="animate-spin" />
            {/if}
            {isEditing ? "Save Changes" : "Add Branch"}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}