import type { Options } from "./types";
import unplugin from ".";

export default (options: Options) => ({
	name: "unplugin-solid",
	hooks: {
		"astro:config:setup": async (astro: any): Promise<void> => {
			astro.config.vite.plugins ??= [];
			astro.config.vite.plugins.push(unplugin.vite(options));
		},
	},
});
