import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		cssMinify: true,
		rollupOptions: {
			output: {
				manualChunks: undefined
			}
		}
	}
});
