import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [sveltekit(), tailwindcss()],
	ssr: {
		// Ensure bits-ui's .svelte files are bundled by Vite instead of being loaded directly by Node
		noExternal: ['bits-ui']
	}
});
