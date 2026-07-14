import type { UserConfig } from "tsdown";
import { defineConfig } from "tsdown";

const config: UserConfig = defineConfig({
  entry: ["src/*.ts"],
  dts: { oxc: true },
  deps: {
    neverBundle: ["vite"],
  },
  exports: true,
});

export default config;
