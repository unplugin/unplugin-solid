import ViteSolid from "@solidjs/vite-plugin";
import { rollupBuild, testFixtures } from "@sxzz/test-utils";
import Oxc from "unplugin-oxc/rollup";
import { resolveConfig } from "vite";
import { describe, expect } from "vitest";

import Solid from "../src/rollup";

async function getCode(file: string, plugin: any) {
  const bundle = await rollupBuild(file, [plugin, Oxc()], {
    external: ["solid-js", "@solidjs/web"],
  });

  return bundle.snapshot;
}

describe("rollup", async () => {
  await testFixtures(
    "test/fixtures/*.{js,ts,jsx,tsx}",
    async (args, id) => {
      const options = { dev: args.dev, compiler: args.compiler };
      const config = await resolveConfig(
        { configFile: false, plugins: [ViteSolid(options)] },
        "build",
      );
      const vite = config.plugins.find((plugin) => plugin.name === "solid")!;
      const viteCode = await getCode(id, vite);
      const unpluginCode = await getCode(id, Solid(options));

      expect(viteCode).toBe(unpluginCode);

      return unpluginCode.replaceAll(
        /(["']__file["']\s*,\s*['"]).*?(['"])/g,
        (_, s1, s2) => `${s1}#FILE#${s2}`,
      );
    },
    {
      params: [
        ["dev", [true, false]],
        ["compiler", ["native", "babel"]],
      ],
      promise: true,
    },
  );
});
