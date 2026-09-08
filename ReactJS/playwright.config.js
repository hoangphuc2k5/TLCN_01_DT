import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:5175', headless: true, viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: [
    { command: 'node scripts/phase0-fixture.js', cwd: fileURLToPath(new URL('../ExpressJS', import.meta.url)), url: 'http://127.0.0.1:8091/v1/api/health', reuseExistingServer: false, timeout: 60000 },
    // Vite must stay alive when the non-interactive runner closes stdin (Windows).
    { command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort', url: 'http://127.0.0.1:5175', env: { CI: 'true', API_PROXY_TARGET: 'http://127.0.0.1:8091', VITE_GOOGLE_CLIENT_ID: '' }, reuseExistingServer: false, timeout: 60000 },
  ],
});
