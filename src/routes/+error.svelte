<script lang="ts">
  import "../app.css";
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button/index.js";
  import Icon from "$lib/components/ui/Icon/index.js";

  const is404 = $derived($page.status === 404);
</script>

<svelte:head>
  <title>{$page.status} — BamanStock</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Raleway:wght@400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">

  <!-- Decorative blurred blob -->
  <div class="absolute w-96 h-96 rounded-full bg-info/10 blur-3xl pointer-events-none"></div>

  <div class="relative z-10 flex flex-col items-center gap-6 max-w-md w-full">

    <!-- Icon ring -->
    <div class="w-28 h-28 rounded-full border-4 border-info/20 bg-info/10 flex items-center justify-center">
      <div class="w-16 h-16 rounded-full bg-info/20 flex items-center justify-center">
        <Icon iconName={is404 ? "icon/map-pin" : "icon/alert-circle"} size={32} class="text-info" />
      </div>
    </div>

    <!-- Status + message -->
    <div class="space-y-2">
      <p class="text-[96px] font-extrabold leading-none text-info">{$page.status}</p>
      <h1 class="text-2xl font-bold text-foreground">
        {is404 ? "Page not found" : "Something went wrong"}
      </h1>
      <p class="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
        {#if is404}
          The page you're looking for doesn't exist or may have been moved.
        {:else}
          {$page.error?.message ?? "An unexpected error occurred. Please try again."}
        {/if}
      </p>
    </div>

    <!-- Divider -->
    <div class="w-16 h-px bg-border"></div>

    <!-- Actions -->
    <div class="flex flex-col sm:flex-row gap-3 w-full justify-center">
      <Button onclick={() => history.back()} variant="outline" class="gap-2 min-w-[140px]">
        <Icon iconName="icon/arrow-left" size={16} />
        Go back
      </Button>
      <Button href="/" class="gap-2 bg-info text-info-foreground hover:bg-info/90 min-w-[140px]">
        <Icon iconName="icon/home" size={16} />
        Home
      </Button>
    </div>

    <!-- Brand footer -->
    <div class="flex items-center gap-2 mt-4 opacity-50">
      <div class="w-6 h-6 rounded-md bg-info flex items-center justify-center">
        <Icon iconName="icon/trending-up" size={14} class="text-info-foreground" />
      </div>
      <span class="text-sm font-bold text-info tracking-wide">BAMANSTOCK</span>
    </div>

  </div>
</div>
