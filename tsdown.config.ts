import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: './src/index.ts',
  outDir: './build',
  sourcemap: true,
  dts: true,
})
