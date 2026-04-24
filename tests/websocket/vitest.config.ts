import { defineConfig } from 'vitest/config'
import { cloudflareTest } from '@cloudflare/vitest-pool-workers'

export default defineConfig({
  test: {
    globals: true,
    globalSetup: './vitest.setup.ts',
  },
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: './wrangler.jsonc',
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
