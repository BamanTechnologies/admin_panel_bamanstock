// The admin panel keeps its session in localStorage, so it cannot render on the
// server. Disabling SSR lets the root layout middleware in +layout.svelte run in
// the browser, where the token is actually readable.
export const ssr = false;
export const prerender = false;
