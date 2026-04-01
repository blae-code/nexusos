import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

function stripJsonComments(value) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function readEmbeddedBase44AppId() {
  try {
    const appConfigPath = path.resolve(process.cwd(), 'base44', '.app.jsonc');
    const raw = fs.readFileSync(appConfigPath, 'utf8');
    const parsed = JSON.parse(stripJsonComments(raw));
    return typeof parsed?.id === 'string' && parsed.id.trim() ? parsed.id.trim() : '';
  } catch {
    return '';
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_BASE44_APP_BASE_URL?.trim();
  const legacySDKImports = env.BASE44_LEGACY_SDK_IMPORTS === 'true';
  const fallbackAppId = env.VITE_BASE44_APP_ID?.trim() || readEmbeddedBase44AppId();

  // The Base44 Vite plugin reads process.env directly, so mirror Vite-loaded env
  // values here to keep local same-origin proxy behavior consistent under npm scripts.
  if (proxyTarget && !process.env.VITE_BASE44_APP_BASE_URL) {
    process.env.VITE_BASE44_APP_BASE_URL = proxyTarget;
  }
  if (fallbackAppId && !process.env.VITE_BASE44_APP_ID) {
    process.env.VITE_BASE44_APP_ID = fallbackAppId;
  }
  if (env.BASE44_LEGACY_SDK_IMPORTS && !process.env.BASE44_LEGACY_SDK_IMPORTS) {
    process.env.BASE44_LEGACY_SDK_IMPORTS = env.BASE44_LEGACY_SDK_IMPORTS;
  }

  return {
    logLevel: 'error', // Suppress warnings, only show errors
    base: './',
    define: {
      __BASE44_APP_ID__: JSON.stringify(fallbackAppId || ''),
    },
    server: proxyTarget ? {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    } : undefined,
    plugins: [
      base44({
        // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
        // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
        legacySDKImports,
        hmrNotifier: true,
        navigationNotifier: true,
        analyticsTracker: false,
        visualEditAgent: true
      }),
      react(),
    ]
  };
});
