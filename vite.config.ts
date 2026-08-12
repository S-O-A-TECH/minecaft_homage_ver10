import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    server: {
        port: 5173,
        strictPort: true,
        host: true
    },
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
