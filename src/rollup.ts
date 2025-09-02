/**
 * This entry file is for Rollup plugin.
 *
 * @module
 */

import unplugin from ".";

/**
 * Rollup plugin
 *
 * @example
 * ```ts
 * // rollup.config.js
 * import Solid from 'unplugin-solid/rollup'
 *
 * export default {
 *   plugins: [Solid()],
 * }
 * ```
 */
const rollup: typeof unplugin.rollup = unplugin.rollup;
export default rollup;
export { rollup as "module.exports" };
