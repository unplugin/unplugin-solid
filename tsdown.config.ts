import type { UserConfig } from "tsdown";
import { defineConfig } from "tsdown";

const config: UserConfig = defineConfig({
	entry: ["./src/*.ts"],
	exports: true,
	shims: true,
	external: ["vite"],
});

export default config;
