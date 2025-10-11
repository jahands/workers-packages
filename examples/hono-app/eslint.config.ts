
import { defineConfig, getConfig, ConfigObject} from '@repo/eslint-config'

const config = getConfig(import.meta.url)

export default defineConfig([config]) as ConfigObject
