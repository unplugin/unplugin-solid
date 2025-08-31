/**
 * This entry file is for esbuild plugin. Requires esbuild >= 0.15
 *
 * @module
 */

import unplugin from '.'

/**
 * Esbuild plugin
 *
 * @example
 * ```ts
 * import { build } from 'esbuild'
 * import Solid from 'unplugin-solid/esbuild'
 *
 * build({ plugins: [Solid()] })
 ```
 */
const esbuild: typeof unplugin.esbuild = unplugin.esbuild
export default esbuild
export { esbuild as 'module.exports' }
