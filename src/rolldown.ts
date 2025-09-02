/**
 * This entry file is for Rolldown plugin.
 *
 * @module
 */

import unplugin from ".";

/**
 * Rolldown plugin
 *
 * @example
 * ```ts
 * // rolldown.config.js
 * import Solid from 'unplugin-solid/rolldown'
 *
 * export default {
 *   plugins: [Solid()],
 * }
 * ```
 */
const rolldown: typeof unplugin.rolldown = unplugin.rolldown;
export default rolldown;
export { rolldown as "module.exports" };
