<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import Icon from "$lib/components/ui/Icon/index.js";
</script>

<nav
  class="sticky top-0 z-50 border-b border-border/20 bg-transparent backdrop-blur-sm"
>
  <div class="container mx-auto px-6">
    <div class="flex h-16 items-center justify-between">
      <!-- Logo/Brand -->
      <a
        href="/"
        class="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <div
          class="w-10 h-10 rounded-xl bg-info flex items-center justify-center"
        >
          <Icon
            iconName="icon/trending-up"
            size={20}
            class="text-info-foreground"
          />
        </div>
        <span class="text-xl font-bold text-info">BAMANSTOCK</span>
      </a>

      <!-- Navigation Links -->
      <div class="hidden md:flex items-center gap-8">
        <a
          href="#features"
          class="text-foreground hover:text-info transition-colors">Features</a
        >
        <a
          href="#how-it-works"
          class="text-foreground hover:text-info transition-colors"
          >How It Works</a
        >
        <a
          href="#about"
          class="text-foreground hover:text-info transition-colors">About</a
        >
        <a
          href="#contact"
          class="text-foreground hover:text-info transition-colors">Contact</a
        >
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-4">
        <Button variant="outline" href="/guideline" size="sm">
          Guidelines
        </Button>
        <Button variant="outline" href="/onboarding/role" size="sm">
          Getting Started
        </Button>
        <a
          href="/onboarding/signin"
          class="text-info hover:opacity-80 transition-opacity"
        >
          Sign in
        </a>
        <Button
          href="/onboarding/role"
          class="bg-info text-info-foreground hover:bg-info/90"
        >
          Register
        </Button>
      </div>
    </div>
  </div>
</nav>
