import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import laravel from 'laravel-vite-plugin';
import { fontsource } from 'laravel-vite-plugin/fonts';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.ts'],
            refresh: true,
            fonts: [
                fontsource('Cormorant Garamond', {
                    alias: 'cormorant-garamond',
                    variable: '--font-display',
                    weights: [500, 600, 700],
                    styles: ['normal'],
                    subsets: ['cyrillic', 'latin'],
                    display: 'swap',
                    preload: [{ weight: 600 }],
                    fallbacks: ['Georgia', 'serif'],
                }),
                fontsource('Cormorant Garamond', {
                    alias: 'cormorant-garamond-italic',
                    variable: '--font-display-italic',
                    weights: [500],
                    styles: ['italic'],
                    subsets: ['cyrillic', 'latin'],
                    display: 'swap',
                    preload: false,
                    fallbacks: ['Georgia', 'serif'],
                    optimizedFallbacks: false,
                }),
                fontsource('Manrope', {
                    alias: 'manrope',
                    variable: '--font-ui',
                    weights: [400, 600, 700, 800],
                    styles: ['normal'],
                    subsets: ['cyrillic', 'latin'],
                    display: 'swap',
                    preload: [{ weight: 400 }],
                    fallbacks: ['system-ui', 'sans-serif'],
                }),
            ],
        }),
        vue(),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
        },
    },
    server: {
        host: '127.0.0.1',
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
