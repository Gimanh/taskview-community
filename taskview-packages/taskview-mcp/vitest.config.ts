import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: ['./src/__tests__/integration/global-setup.ts'],
  },
})
