import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        outDir: 'dist',
        lib: {
            entry: 'src/z-zoomer.ts',
            formats: ['es'],
        },
    },
});
