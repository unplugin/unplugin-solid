import type { TransformOptions } from "@babel/core";
import type { ConfigEnv, Plugin, UserConfig } from "vite";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Solid from "../src/vite";

const { crawlFrameworkPkgs } = vi.hoisted(() => ({
  crawlFrameworkPkgs: vi.fn(),
}));

vi.mock("vitefu", () => ({ crawlFrameworkPkgs }));

const configEnv: ConfigEnv = {
  command: "build",
  mode: "production",
  isPreview: false,
  isSsrBuild: false,
};

type HookHandler = (...args: unknown[]) => unknown;

function getHookHandler(hook: unknown): HookHandler {
  if (typeof hook === "function") {
    return hook as HookHandler;
  }

  return (hook as { handler: HookHandler }).handler;
}

const runConfig = async (
  plugin: Plugin,
  userConfig: UserConfig = {},
  env: ConfigEnv = configEnv,
): Promise<UserConfig> =>
  (await getHookHandler(plugin.config).call({}, userConfig, env)) as UserConfig;

async function runConfigEnvironment(
  plugin: Plugin,
  name: string,
  config: Record<string, unknown>,
): Promise<void> {
  await getHookHandler(plugin.configEnvironment).call({}, name, config, {
    isSsrTargetWebworker: false,
  });
}

const runTransform = async (
  plugin: Plugin,
  source: string,
  id: string,
  ssr: boolean,
): Promise<{ code: string; map?: unknown } | null | undefined> =>
  (await getHookHandler(plugin.transform).call({}, source, id, {
    ssr,
  })) as { code: string; map?: unknown } | null | undefined;

describe("vite", () => {
  beforeEach(() => {
    crawlFrameworkPkgs.mockReset().mockResolvedValue({
      optimizeDeps: {
        include: ["vitefu-include"],
        exclude: ["vitefu-exclude"],
      },
      ssr: {
        noExternal: ["vitefu-no-external"],
        external: ["vitefu-external"],
      },
    });
  });

  it("preserves JSX for Vite 8 dependency optimization without top-level SSR config", async () => {
    const result = await runConfig(Solid());

    expect(result.optimizeDeps).toMatchObject({
      rolldownOptions: {
        transform: {
          jsx: "preserve",
        },
      },
    });
    expect(result).not.toHaveProperty("ssr");
  });

  it("merges vitefu SSR resolution into existing environment config", async () => {
    const plugin = Solid();
    await runConfig(plugin);
    const environment = {
      consumer: "server",
      resolve: {
        conditions: ["node"],
        noExternal: ["existing-no-external"],
        external: ["existing-external"],
      },
    };

    await runConfigEnvironment(plugin, "ssr", environment);

    expect(environment.resolve.noExternal).toEqual([
      "existing-no-external",
      "vitefu-no-external",
    ]);
    expect(environment.resolve.external).toEqual([
      "existing-external",
      "vitefu-external",
    ]);
  });

  it("does not append SSR externals when noExternal is true", async () => {
    const plugin = Solid();
    await runConfig(plugin);
    const environment = {
      consumer: "server",
      resolve: {
        conditions: ["node"],
        noExternal: true,
        external: ["existing-external"],
      },
    };

    await runConfigEnvironment(plugin, "ssr", environment);

    expect(environment.resolve.noExternal).toBeTruthy();
    expect(environment.resolve.external).toEqual(["existing-external"]);
  });

  it("does not add the browser condition in test mode when SSR is forced", async () => {
    const plugin = Solid({ ssr: true });
    await runConfig(plugin, { mode: "test" }, { ...configEnv, mode: "test" });
    const environment = {
      consumer: "client",
      resolve: {
        conditions: ["module"],
      },
    };

    await runConfigEnvironment(plugin, "client", environment);

    expect(environment.resolve.conditions).toContain("solid");
    expect(environment.resolve.conditions).not.toContain("browser");
  });

  it("uses Vite's transform SSR flag for client and server output", async () => {
    const ssrValues: boolean[] = [];
    const babel = vi.fn(
      (_source: string, _id: string, ssr: boolean): TransformOptions => {
        ssrValues.push(ssr);

        return {};
      },
    );
    const plugin = Solid({ babel, ssr: true });
    const source = "export default () => <main>Hello</main>";

    const client = await runTransform(plugin, source, "/src/App.tsx", false);
    const server = await runTransform(plugin, source, "/src/App.tsx", true);

    expect(ssrValues).toEqual([false, true]);
    expect(client?.code).not.toBe(server?.code);
    expect(client?.code).toContain("template");
    expect(server?.code).toContain("ssr");
  });

  it("skips files excluded by the transform filter", async () => {
    const babel = vi.fn((): TransformOptions => ({}));
    const plugin = Solid({
      include: /\.tsx$/,
      exclude: /excluded/,
      babel,
    });

    const result = await runTransform(
      plugin,
      "export default () => <div />",
      "/src/excluded.tsx",
      false,
    );

    expect(result).toBeUndefined();
    expect(babel).not.toHaveBeenCalled();
  });
});
