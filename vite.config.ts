import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
const root = fileURLToPath(new URL('.', import.meta.url))
export default defineConfig({
  base: './',
  build: {rollupOptions: {input: {main: resolve(root,'index.html'),workshop: resolve(root,'workshop.html')}}},
  test: {include: ['tests/**/*.test.ts']},
})
