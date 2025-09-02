/**
 * This entry file is for webpack plugin.
 *
 * @module
 */

import unplugin from ".";

/**
 * Webpack plugin
 *
 * @example
 * ```js
 * // webpack.config.js
 * import Solid from 'unplugin-solid/webpack'
 *
 * default export {
 *  plugins: [Solid()],
 * }
 * ```
 */
const webpack: typeof unplugin.webpack = unplugin.webpack;
export default webpack;
export { webpack as "module.exports" };
