import { Config, defineConfig, getConfig } from './src/default.config'

const config = getConfig(import.meta.url)

export default defineConfig([config]) as Config
