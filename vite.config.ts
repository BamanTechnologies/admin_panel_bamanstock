import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

function gqlPlugin() {
  return {
    name: 'gql',
    transform(code: string, id: string) {
      if (!id.endsWith('.gql')) return;
      const escaped = code.replace(/`/g, '\\`');
      return {
        code: `import { gql } from '@apollo/client';\nexport default gql\`${escaped}\`;`,
        map: null,
      };
    },
  };
}

export default defineConfig({
	plugins: [sveltekit(), tailwindcss(), gqlPlugin()],
	ssr: {
		// Ensure bits-ui's .svelte files are bundled by Vite instead of being loaded directly by Node
		noExternal: ['bits-ui']
	}
});
