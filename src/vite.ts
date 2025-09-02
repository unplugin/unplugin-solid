/**
 * This entry file is for Vite plugin.
 *
 * @module
 */

import unplugin from ".";

/**
 * Vite plugin
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import Solid from 'unplugin-solid/vite'
 *
 * export default defineConfig({
 *   plugins: [Solid()],
 * })
 * ```
 */
const vite: typeof unplugin.vite = unplugin.vite;
export default vite;
export { vite as "module.exports" };
