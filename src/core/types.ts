import type { TransformOptions } from "@babel/core";
import type { FilterPattern } from "@rollup/pluginutils";

interface ExtensionOptions {
	typescript?: boolean;
}

export interface Options {
	/**
	 * A [picomatch](https://github.com/micromatch/picomatch) pattern, or array of patterns, which specifies the files
	 * the plugin should operate on.
	 */
	include?: FilterPattern;
	/**
	 * A [picomatch](https://github.com/micromatch/picomatch) pattern, or array of patterns, which specifies the files
	 * to be ignored by the plugin.
	 */
	exclude?: FilterPattern;
	/**
	 * This will inject solid-js/dev in place of solid-js in dev mode. Has no
	 * effect in prod. If set to `false`, it won't inject it in dev. This is
	 * useful for extra logs and debugging.
	 *
	 * @default true
	 */
	dev?: boolean;
	/**
	 * This will force SSR code in the produced files.
	 *
	 * @default false
	 */
	ssr?: boolean;

	/**
	 * This will inject HMR runtime in dev mode. Has no effect in prod. If
	 * set to `false`, it won't inject the runtime in dev.
	 *
	 * @default true
	 */
	hot?: boolean;
	/**
	 * This registers additional extensions that should be processed by
	 * vite-plugin-solid.
	 *
	 * @default undefined
	 */
	extensions?: (string | [string, ExtensionOptions])[];
	/**
	 * Pass any additional babel transform options. They will be merged with
	 * the transformations required by Solid.
	 *
	 * @default {}
	 */
	babel?:
		| TransformOptions
		| ((source: string, id: string, ssr: boolean) => TransformOptions)
		| ((source: string, id: string, ssr: boolean) => Promise<TransformOptions>);
	/**
	 * Pass any additional [babel-plugin-jsx-dom-expressions](https://github.com/ryansolid/dom-expressions/tree/main/packages/babel-plugin-jsx-dom-expressions#plugin-options).
	 * They will be merged with the defaults sets by [babel-preset-solid](https://github.com/solidjs/solid/blob/main/packages/babel-preset-solid/index.js#L8-L25).
	 *
	 * @default {}
	 */
	solid?: {
		/**
		 * Remove unnecessary closing tags from template strings. More info here:
		 * https://github.com/solidjs/solid/blob/main/CHANGELOG.md#smaller-templates
		 *
		 * @default false
		 */
		omitNestedClosingTags?: boolean;

		/**
		 * Remove the last closing tag from template strings. Enabled by default even when `omitNestedClosingTags` is disabled.
		 * Can be disabled for compatibility for some browser-like environments.
		 *
		 * @default true
		 */
		omitLastClosingTag?: boolean;

		/**
		 * Remove unnecessary quotes from template strings.
		 * Can be disabled for compatibility for some browser-like environments.
		 *
		 * @default true
		 */
		omitQuotes?: boolean;

		/**
		 * The name of the runtime module to import the methods from.
		 *
		 * @default "solid-js/web"
		 */
		moduleName?: string;

		/**
		 * The output mode of the compiler.
		 * Can be:
		 * - "dom" is standard output
		 * - "ssr" is for server side rendering of strings.
		 * - "universal" is for using custom renderers from solid-js/universal
		 *
		 * @default "dom"
		 */
		generate?: "ssr" | "dom" | "universal";

		/**
		 * Indicate whether the output should contain hydratable markers.
		 *
		 * @default false
		 */
		hydratable?: boolean;

		/**
		 * Boolean to indicate whether to enable automatic event delegation on camelCase.
		 *
		 * @default true
		 */
		delegateEvents?: boolean;

		/**
		 * Boolean indicates whether smart conditional detection should be used.
		 * This optimizes simple boolean expressions and ternaries in JSX.
		 *
		 * @default true
		 */
		wrapConditionals?: boolean;

		/**
		 * Boolean indicates whether to set current render context on Custom Elements and slots.
		 * Useful for seemless Context API with Web Components.
		 *
		 * @default true
		 */
		contextToCustomElements?: boolean;

		/**
		 * Array of Component exports from module, that aren't included by default with the library.
		 * This plugin will automatically import them if it comes across them in the JSX.
		 *
		 * @default ["For","Show","Switch","Match","Suspense","SuspenseList","Portal","Index","Dynamic","ErrorBoundary"]
		 */
		builtIns?: string[];
	};
}
