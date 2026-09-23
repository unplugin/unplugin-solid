import path from "node:path";

import { build, createServer } from "vite";
import { describe, expect, it } from "vitest";
import { defineConfig } from "vitest/config";

import Solid from "../src/vite";

// Adapted from solidjs/solid-vite-plugin at c94fcf351cb5e8392fc8c3d5085886b943dc2725 (MIT):
// examples/start-ssr/src/{posture,server-posture}.test.tsx
// examples/ssr/test/boundary.mjs

describe("Vite", () => {
  it.each([
    ["jsdom", /template/, /getNextElement|ssrElement|ssr\(/],
    ["node", /\bssr(?:Element)?\b/, /getNextElement|cloneNode/],
  ] as const)(
    "uses %s test compilation even when the application enables SSR",
    async (environment, generated, excluded) => {
      const server = await createServer({
        configFile: false,
        ...defineConfig({
          mode: "test",
          plugins: [Solid({ ssr: true })],
          test: environment === "node" ? { environment } : undefined,
        }),
        server: { middlewareMode: true, watch: null, hmr: false },
        optimizeDeps: { noDiscovery: true },
      });
      try {
        const target = environment === "node" ? "ssr" : "client";
        const result = await server.environments[target].transformRequest(
          "/test/fixtures/basic.tsx",
        );
        const conditions = server.environments.ssr.config.resolve.conditions;

        expect(conditions.includes("browser")).toBe(environment === "jsdom");
        expect(server.config).toMatchObject({ test: { environment } });
        expect(result?.code).toMatch(generated);
        expect(result?.code).not.toMatch(excluded);
      } finally {
        await server.close();
      }
    },
  );

  it.each(["server-only", "client-only"])(
    "enforces the %s boundary during builds",
    async (marker) => {
      const entry = path.resolve(`test/fixtures/boundaries/${marker}.ts`);
      const runBuild = (ssr: boolean) =>
        build({
          configFile: false,
          logLevel: "silent",
          plugins: [Solid({ ssr: true })],
          build: {
            write: false,
            ssr: ssr ? entry : false,
            rolldownOptions: ssr ? {} : { input: entry },
          },
        });

      await expect(runBuild(marker === "server-only")).resolves.toBeDefined();
      await expect(runBuild(marker !== "server-only")).rejects.toThrow(
        `[unplugin-solid] Cannot import '${marker}' in a ${marker === "server-only" ? "client" : "server"} module: ${entry}`,
      );
    },
  );
});
