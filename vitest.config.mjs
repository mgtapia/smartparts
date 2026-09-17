import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@contexts': path.resolve(__dirname, 'src/contexts'),
      '@hocs': path.resolve(__dirname, 'src/hocs'),
      '@theme': path.resolve(__dirname, 'src/theme'),
      '@libs': path.resolve(__dirname, 'src/libs'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@schemas': path.resolve(__dirname, 'src/schemas'),
      '@constants': path.resolve(__dirname, 'src/constants'),
      '@mocks': path.resolve(__dirname, 'src/mocks'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@connectors': path.resolve(__dirname, 'src/connectors'),
    },
  },
})
