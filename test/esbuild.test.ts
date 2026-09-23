import { testFixtures } from "@sxzz/test-utils";
import { build } from "esbuild";
import { describe, expect } from "vitest";

import Solid from "../src/esbuild";

describe("esbuild", async () => {
  await testFixtures(
    "test/fixtures/*.{js,ts,jsx,tsx}",
    async (args, id) => {
      const result = await build({
        entryPoints: [id],
        bundle: true,
        external: ["solid-js", "@solidjs/web"],
        treeShaking: true,
        format: "esm",
        plugins: [
          Solid({
            dev: args.dev,
            compiler: args.compiler,
          }),
        ],
        write: false,
      });
      const codes = result.outputFiles.map((file) => file.text).join("\n");

      expect(
        codes
          .replaceAll(JSON.stringify(id), '"#FILE#"')
          .replaceAll("\0", "[NULL]"),
      ).toMatchSnapshot();
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
