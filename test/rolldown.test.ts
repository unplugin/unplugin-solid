import { rolldownBuild, testFixtures } from "@sxzz/test-utils";
import { describe, expect, test } from "vitest";

import Solid from "../src/rolldown";

async function getCode(file: string, plugin: ReturnType<typeof Solid>) {
  const bundle = await rolldownBuild(file, [plugin]);

  return bundle.snapshot;
}

describe("rolldown", async () => {
  test("preserves JSX and defaults Solid externals", async () => {
    const plugin = Solid();
    const optionsHook = plugin.options;

    expect(optionsHook).toBeDefined();

    if (!optionsHook) {
      return;
    }

    const handler =
      typeof optionsHook === "function" ? optionsHook : optionsHook.handler;
    type InputOptions = Parameters<typeof handler>[0];

    const inputOptions: InputOptions = {};
    const result = await handler.call({} as never, inputOptions);
    const outputOptions = result ?? inputOptions;

    expect(outputOptions.transform).toEqual({ jsx: "preserve" });
    expect(outputOptions.external).toEqual([
      "solid-js",
      "solid-js/web",
      "solid-js/store",
      "solid-js/html",
      "solid-js/h",
    ]);
  });

  await testFixtures(
    "test/fixtures/*.{js,ts,jsx,tsx}",
    async (args, id) => {
      const unpluginCode = await getCode(
        id,
        Solid({
          dev: args.dev,
        }),
      );

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
