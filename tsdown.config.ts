import type { UserConfig } from "tsdown";
import { defineConfig } from "tsdown";

const config: UserConfig = defineConfig({
  entry: ["src/*.ts"],
  dts: { oxc: true },
  deps: {
    onlyBundle: [],
    neverBundle: ["vite"],
  },
  exports: true,
  publint: "ci-only",
  attw: {
    enabled: "ci-only",
    profile: "esm-only",
  },
});

export default config;
