import { cp, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import VueI18n from '@intlify/unplugin-vue-i18n/vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import Unocss from 'unocss/vite';
import AutoImport from 'unplugin-auto-import/vite';
import IconsResolver from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import { type Plugin, defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import markdown from 'vite-plugin-vue-markdown';
import svgLoader from 'vite-svg-loader';
import { configDefaults } from 'vitest/config';

const baseUrl = process.env.BASE_URL ?? '/';

/**
 * Serve the figlet fonts from our own origin instead of a CDN.
 *
 * The ASCII text drawer fetched its `.flf` files from `//unpkg.com/...` at runtime. A
 * protocol-relative URL resolves to `file://` when the built app is opened from disk, strict
 * `connect-src` policies block the request outright, and any offline or air-gapped deployment fails
 * silently with "Loading font..." forever. Copying the fonts into the bundle output removes the
 * third-party runtime dependency; they are still fetched individually on demand, so nothing is
 * added to the initial payload.
 */
function figletFonts(): Plugin {
  const source = resolve(__dirname, 'node_modules/figlet/fonts');
  const route = '/figlet-fonts/';

  return {
    name: 'it-tools:figlet-fonts',
    configureServer(server) {
      server.middlewares.use(route, (request, response, next) => {
        const name = decodeURIComponent((request.url ?? '').split('?')[0].replace(/^\//, ''));

        if (!name || name.includes('..') || !name.endsWith('.flf')) {
          next();
          return;
        }

        readFile(resolve(source, name))
          .then((content) => {
            response.setHeader('Content-Type', 'text/plain; charset=utf-8');
            response.end(content);
          })
          .catch(() => next());
      });
    },
    async closeBundle() {
      await cp(source, resolve(__dirname, 'dist/figlet-fonts'), { recursive: true });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    figletFonts(),
    VueI18n({
      runtimeOnly: true,
      jitCompilation: true,
      compositionOnly: true,
      fullInstall: true,
      strictMessage: false,
      include: [
        resolve(__dirname, 'locales/**'),
      ],
    }),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        '@vueuse/core',
        'vue-i18n',
        {
          'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar'],
        },
      ],
      vueTemplate: true,
      eslintrc: {
        enabled: true,
      },
    }),
    Icons({ compiler: 'vue3' }),
    vue({
      include: [/\.vue$/, /\.md$/],
    }),
    vueJsx(),
    markdown(),
    svgLoader(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      manifest: {
        name: 'IT Tools',
        description: 'Aggregated set of useful tools for developers.',
        display: 'standalone',
        lang: 'fr-FR',
        start_url: `${baseUrl}?utm_source=pwa&utm_medium=pwa`,
        orientation: 'any',
        theme_color: '#18a058',
        background_color: '#f1f5f9',
        icons: [
          {
            src: '/favicon-16x16.png',
            type: 'image/png',
            sizes: '16x16',
          },
          {
            src: '/favicon-32x32.png',
            type: 'image/png',
            sizes: '32x32',
          },
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
    Components({
      dirs: ['src/'],
      extensions: ['vue', 'md'],
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      resolvers: [NaiveUiResolver(), IconsResolver({ prefix: 'icon' })],
    }),
    Unocss(),
  ],
  base: baseUrl,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(process.env.npm_package_version),
  },
  test: {
    exclude: [...configDefaults.exclude, '**/*.e2e.spec.ts'],
  },
  build: {
    target: 'esnext',
  },
});
