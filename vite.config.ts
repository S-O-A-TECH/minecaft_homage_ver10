import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    build: {
        target: 'esnext',
        rollupOptions: {
            output: {
                manualChunks: {
                    three: ['three'],
                    'simplex-noise': ['simplex-noise'],
                },
            },
        },
    },
});
