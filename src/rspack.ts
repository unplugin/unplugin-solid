/**
 * This entry file is for Rspack plugin.
 *
 * @module
 */

import unplugin from '.'

/**
 * Rspack plugin
 *
 * @example
 * ```js
 * // rspack.config.js
 * import Solid from 'unplugin-solid/rspack'
 *
 * default export {
 *  plugins: [Solid()],
 * }
 * ```
 */
const rspack: typeof unplugin.rspack = unplugin.rspack
export default rspack
export { rspack as 'module.exports' }
