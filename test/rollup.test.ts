import process from "node:process";

import { rollupBuild, testFixtures } from "@sxzz/test-utils";
import Oxc from "unplugin-oxc/rollup";
import ViteSolid from "vite-plugin-solid";
import { describe, expect } from "vitest";

import Solid from "../src/rollup";
import type { Options } from "../src/types";

async function getCode(file: string, plugin: any) {
	const bundle = await rollupBuild(file, [plugin, Oxc()], {
		external: ["solid-js"],
	});

	return bundle.snapshot;
}

function createPlugins(opt: Options & { root: string }) {
	const vite = ViteSolid(opt);
	// @ts-expect-error
	vite.configResolved!({
		root: opt.root,
		command: "build",
		dev: opt.dev,
		build: {
			sourcemap: false,
		},
		define: {},
		logger: {},
	} as any);

	return {
		unplugin: Solid(opt),
		vite,
	};
}

describe("rollup", async () => {
	await testFixtures(
		"test/fixtures/*.{js,ts,jsx,tsx}",
		async (args, id) => {
			const { unplugin, vite } = createPlugins({
				root: process.cwd(),
				dev: args.dev,
			});

			const viteCode = await getCode(id, vite);
			const unpluginCode = await getCode(id, unplugin);

			expect(viteCode).toBe(unpluginCode);

			return unpluginCode.replaceAll(
				/(["']__file["']\s*,\s*['"]).*?(['"])/g,
				(_, s1, s2) => `${s1}#FILE#${s2}`,
			);
		},
		{
			params: [["dev", [true, false]]],
			promise: true,
		},
	);
});
