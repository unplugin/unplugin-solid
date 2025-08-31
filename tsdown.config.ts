import { defineConfig, type UserConfig } from 'tsdown'

const config: UserConfig = defineConfig({
  entry: ['./src/*.ts'],
  exports: true,
  shims: true,
  external: ['vite'],
})

export default config
