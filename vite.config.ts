import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import dyadComponentTagger from '@dyad-sh/react-vite-component-tagger';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5000,
        host: '0.0.0.0',
        strictPort: true,
        allowedHosts: true,
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: false,
            secure: false,
            cookieDomainRewrite: '',
            headers: {
              'X-Forwarded-Host': process.env.REPLIT_DEV_DOMAIN || '',
              'X-Forwarded-Proto': 'https'
            }
          }
        }
      },
      plugins: [
        dyadComponentTagger(),
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'logo.jpg'],
          manifest: {
            name: 'TreePro AI',
            short_name: 'TreePro',
            description: 'AI-powered business management for tree service companies',
            theme_color: '#10b981',
            background_color: '#0f172a',
            display: 'standalone',
            orientation: 'portrait',
            start_url: '/',
            scope: '/',
            icons: [
              {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any maskable'
              },
              {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,woff,woff2}'],
            runtimeCaching: [
              {
                urlPattern: /^https?:\/\/.*\/api\/jobs/,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'jobs-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24
                  },
                  networkTimeoutSeconds: 10
                }
              },
              {
                urlPattern: /^https?:\/\/.*\/api\/clients/,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'clients-cache',
                  expiration: {
                    maxEntries: 200,
                    maxAgeSeconds: 60 * 60 * 24
                  },
                  networkTimeoutSeconds: 10
                }
              },
              {
                urlPattern: /^https?:\/\/.*\/api\/equipment/,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'equipment-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24
                  },
                  networkTimeoutSeconds: 10
                }
              }
            ]
          },
          devOptions: {
            enabled: true
          }
        })
      ],
      define: {
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY ?? ''),
        'import.meta.env.VITE_GOOGLE_MAPS_KEY': JSON.stringify(env.VITE_GOOGLE_MAPS_KEY ?? ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '@assets': path.resolve(__dirname, 'attached_assets')
        }
      }
    };
});
