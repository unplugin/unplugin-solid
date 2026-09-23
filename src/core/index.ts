// Adapted from solidjs/solid-vite-plugin at c94fcf351cb5e8392fc8c3d5085886b943dc2725 (MIT).
import path from "node:path";
import process from "node:process";

import remapping from "@ampproject/remapping";
import type { TransformOptions } from "@babel/core";
import { mergeAndConcat } from "merge-anything";
import type {
  SourceMapCompact,
  UnpluginFactory,
  UnpluginInstance,
} from "unplugin";
import { createUnplugin } from "unplugin";
import type { HotPayload, ViteDevServer } from "vite";
import { crawlFrameworkPkgs } from "vitefu";

import {
  cleanModuleId,
  isTsrxCssModule,
  isTsrxModule,
  offsetSourceMapLine,
  prependTsrxCssImport,
  resolveTsrxCssModule,
  resolvedTsrxCssModuleId,
  tsrxCssSourceId,
  updateTsrxCss,
} from "./tsrx";
import type { Options, SolidOptions } from "./types";
import {
  containsSolidField,
  getJestDomExport,
  isNonRuntimeSolidPkg,
} from "./utils";

const SOLID_RUNTIME_PKGS = ["solid-js", "@solidjs/web"];
const REFRESH_RUNTIME_SOURCE = "solid-js/refresh";
const BOUNDARY_MODULE_ID = "\0unplugin-solid:boundary-modules";
const LAZY_PLACEHOLDER_PREFIX = "__SOLID_LAZY_MODULE__:";

type SourceMap = SourceMapCompact;

function combineSourcemaps(
  maps: (SourceMap | string | null | undefined)[],
): SourceMap | null {
  const chain = maps
    .filter((map) => map != null)
    .map((map) =>
      typeof map === "string" ? JSON.parse(map) : { ...map, version: 3 },
    );
  if (chain.length === 0) {
    return null;
  }
  if (chain.length === 1) {
    return chain[0];
  }

  return JSON.parse(remapping(chain.reverse(), () => null).toString());
}

function isServerEnvironment(
  context: unknown,
  options?: { ssr?: boolean },
): boolean {
  const consumer = (
    context as { environment?: { config: { consumer?: string } } }
  ).environment?.config.consumer;

  return consumer ? consumer === "server" : options?.ssr === true;
}

export const unpluginFactory: UnpluginFactory<Options | undefined, false> = (
  options = {},
  meta,
) => {
  const isVite = meta.framework === "vite";
  let dev = options.dev === true;
  const observe = options.observe === true;
  let needHmr = false;
  let projectRoot = process.cwd();
  let isTestMode = false;
  let serverTestPosture = false;
  let filter: (id: string) => boolean;
  let devServer: ViteDevServer;
  let solidPkgsConfig: Awaited<ReturnType<typeof crawlFrameworkPkgs>>;
  const tsrxCss = new Map<string, string>();

  const getSolidOptions = (ssr: boolean): SolidOptions => ({
    generate: ssr && (options.ssr || isTestMode) ? "ssr" : "dom",
    hydratable: !isTestMode && options.ssr === true,
    dev,
    ...(dev || observe ? { componentNames: true } : {}),
    ...options.solid,
  });

  async function compile(source: string, id: string, ssr: boolean) {
    if (id.includes("\0") || isTsrxCssModule(id)) {
      return null;
    }
    id = cleanModuleId(id);
    const extension = path.extname(id);
    const customExtension = options.extensions?.find(
      (item) => (typeof item === "string" ? item : item[0]) === extension,
    );
    const tsrx = isVite && isTsrxModule(id);
    if (!/\.[mc]?[tj]sx$/i.test(id) && !tsrx && !customExtension) {
      return null;
    }

    const typescript =
      tsrx ||
      /\.[mc]?tsx$/i.test(id) ||
      (Array.isArray(customExtension) && customExtension[1].typescript);
    const filename =
      tsrx || /\.(?:[mc]?[jt]s|[jt]sx)$/i.test(id)
        ? id
        : `${id}.${typescript ? "tsx" : "jsx"}`;
    const solidOptions = getSolidOptions(ssr);
    const babelOptions =
      typeof options.babel === "function"
        ? await options.babel(source, id, ssr)
        : options.babel;
    const maps: (SourceMap | string | null | undefined)[] = [];
    const compiler =
      isVite || options.compiler !== "babel"
        ? await import("@solidjs/compiler")
        : undefined;
    const refresh = needHmr && !ssr && !id.includes("node_modules");
    let code = source;
    let css = "";

    async function babelTransform(filename: string) {
      const { transformAsync } = await import("@babel/core");
      const plugins: NonNullable<TransformOptions["plugins"]> = [];
      if (options.compiler === "babel") {
        // @ts-expect-error @solidjs/babel-plugin does not publish declarations.
        const { default: solid } = await import("@solidjs/babel-plugin");
        plugins.push([solid, solidOptions]);
      }
      const result = await transformAsync(
        code,
        mergeAndConcat(babelOptions ?? {}, {
          root: projectRoot,
          filename,
          sourceFileName: id,
          ast: false,
          sourceMaps: true,
          configFile: false,
          babelrc: false,
          parserOpts: {
            plugins: typescript
              ? ["jsx", "decorators", "typescript"]
              : ["jsx", "decorators"],
          },
          plugins,
        } satisfies TransformOptions),
      );
      if (!result) {
        return false;
      }
      code = result.code!;
      maps.push(result.map);
      if (tsrx && options.compiler === "babel") {
        css = (result.metadata as { css?: string }).css ?? "";
      }

      return true;
    }

    // TSRX must be lowered before the lazy and refresh passes can parse it.
    if (tsrx) {
      if (options.compiler === "babel") {
        if (!(await babelTransform(id))) {
          return null;
        }
      } else {
        const result = await compiler!.transformAsync(code, {
          ...solidOptions,
          filename,
          sourceMap: true,
        });
        code = result.code;
        css = result.css ?? "";
        maps.push(result.map);
        if (options.babel && !(await babelTransform(`${id}.tsx`))) {
          return null;
        }
      }
    }

    if (isVite) {
      const passFilename = tsrx ? `${id}.tsx` : filename;
      const lazyResult = await compiler!.transformLazyAsync(code, {
        filename: passFilename,
        sourceMap: true,
      });
      code = lazyResult.code;
      maps.push(lazyResult.map);
      if (refresh) {
        const refreshResult = await compiler!.transformRefreshAsync(code, {
          filename: passFilename,
          bundler: "vite",
          fixRender: true,
          ...(typeof options.refresh?.granular === "boolean"
            ? { granular: options.refresh.granular }
            : {}),
          jsx: false,
          importSource: REFRESH_RUNTIME_SOURCE,
          sourceMap: true,
        });
        code = refreshResult.code;
        maps.push(refreshResult.map);
      }
    }

    if (!tsrx) {
      if (
        (options.compiler === "babel" || options.babel !== undefined) &&
        !(await babelTransform(id))
      ) {
        return null;
      }
      if (options.compiler !== "babel") {
        const result = await compiler!.transformAsync(code, {
          ...solidOptions,
          filename,
          sourceMap: true,
        });
        code = result.code;
        maps.push(result.map && { ...JSON.parse(result.map), sources: [id] });
      }
    }

    // The native TSRX frontend does not yet provide a composable source map.
    let map =
      tsrx && options.compiler !== "babel" ? null : combineSourcemaps(maps);
    if (tsrx) {
      updateTsrxCss(tsrxCss, id, css);
      if (css) {
        code = prependTsrxCssImport(code, id);
        map = offsetSourceMapLine(map);
      }
      const { transformWithOxc } = await import("vite");
      const stripped = await transformWithOxc(
        code,
        `${id}.tsx`,
        {
          lang: "tsx",
          sourcemap: map != null,
          target: "esnext",
        },
        map ?? undefined,
      );
      code = stripped.code;
      map = map == null ? null : (stripped.map ?? null);
    }

    return { code, map };
  }

  return {
    name: "unplugin-solid",
    enforce: "pre",
    rolldown: {
      options(opts) {
        opts.external ??= SOLID_RUNTIME_PKGS;
        opts.transform ??= { jsx: "preserve" };
      },
    },
    transform: {
      filter: { id: { include: options.include, exclude: options.exclude } },
      handler(source, id) {
        return compile(source, id, options.ssr === true);
      },
    },
    vite: {
      async config(userConfig, { command }) {
        dev =
          options.dev === true ||
          (options.dev !== false && command === "serve");
        projectRoot = path.resolve(userConfig.root ?? projectRoot);
        isTestMode = userConfig.mode === "test";
        const userTest =
          (
            userConfig as typeof userConfig & {
              test?: {
                environment?: string;
                setupFiles?: string | string[];
                browser?: { enabled?: boolean };
                workspace?: unknown;
                projects?: unknown;
                server?: {
                  deps?: {
                    inline?: boolean | (string | RegExp)[];
                    external?: (string | RegExp)[];
                  };
                };
              };
            }
          ).test ?? {};
        const test: typeof userTest = {};
        serverTestPosture =
          isTestMode &&
          ["edge-runtime", "node"].includes(userTest.environment ?? "");
        solidPkgsConfig = await crawlFrameworkPkgs({
          viteUserConfig: userConfig,
          root: projectRoot,
          isBuild: command === "build",
          isFrameworkPkgByJson: (pkg) => containsSolidField(pkg.exports ?? {}),
          isFrameworkPkgByName: (name) =>
            isNonRuntimeSolidPkg(name) ? false : undefined,
          isSemiFrameworkPkgByJson(pkg) {
            if ((!dev && !observe) || isTestMode) {
              return false;
            }

            return SOLID_RUNTIME_PKGS.some(
              (name) =>
                Boolean(pkg.dependencies?.[name]) ||
                Boolean(pkg.peerDependencies?.[name]),
            );
          },
        });
        if (isTestMode) {
          if (
            !userTest.environment &&
            !userTest.browser?.enabled &&
            !userTest.workspace &&
            !userTest.projects
          ) {
            test.environment = "jsdom";
          }
          if (serverTestPosture) {
            if (!userTest.server?.deps?.inline) {
              test.server = {
                deps: { inline: [/solid-js/, /@solidjs[+/]web/] },
              };
            }
          } else if (
            !userTest.server?.deps?.external?.some((item) =>
              /solid-js/.test(item.toString()),
            )
          ) {
            test.server = { deps: { external: [/solid-js/] } };
          }
          if (!userTest.browser?.enabled && !serverTestPosture) {
            const setupFiles =
              typeof userTest.setupFiles === "string"
                ? [userTest.setupFiles]
                : (userTest.setupFiles ?? []);
            const jestDom = getJestDomExport(setupFiles, projectRoot);
            if (jestDom) {
              test.setupFiles = [jestDom];
            }
          }
        }
        const nestedDeps = dev ? SOLID_RUNTIME_PKGS : [];

        return {
          resolve: { dedupe: nestedDeps },
          optimizeDeps: {
            extensions: [".tsrx"],
            include: [
              ...nestedDeps,
              ...(command === "serve" &&
              options.hot !== false &&
              !options.refresh?.disabled
                ? [REFRESH_RUNTIME_SOURCE]
                : []),
              ...solidPkgsConfig.optimizeDeps.include,
            ],
            exclude: solidPkgsConfig.optimizeDeps.exclude,
            rolldownOptions: {
              transform: { jsx: { runtime: "classic" as const } },
              plugins: [
                {
                  name: "unplugin-solid:tsrx-dep-scan",
                  async transform(source, id) {
                    if (!isTsrxModule(id) || isTsrxCssModule(id)) {
                      return null;
                    }
                    const { transformAsync } =
                      await import("@solidjs/compiler");
                    const { transformWithOxc } = await import("vite");
                    const result = await transformAsync(source, {
                      ...getSolidOptions(false),
                      filename: cleanModuleId(id),
                      sourceMap: false,
                    });
                    const stripped = await transformWithOxc(
                      result.code,
                      `${cleanModuleId(id)}.tsx`,
                      { lang: "tsx", sourcemap: false, target: "esnext" },
                    );

                    return { code: stripped.code, map: null };
                  },
                },
              ],
            },
          },
          ...(Object.keys(test).length > 0 ? { test } : {}),
        };
      },
      async configEnvironment(name, config, opts) {
        const {
          createFilter,
          defaultClientConditions,
          defaultServerConditions,
          defaultExternalConditions,
        } = await import("vite");
        config.resolve ??= {};
        config.resolve.conditions ??= [
          ...(config.consumer === "client" ||
          name === "client" ||
          opts.isSsrTargetWebworker
            ? defaultClientConditions
            : defaultServerConditions),
        ];
        config.resolve.conditions = [
          "solid",
          ...(dev ? ["development"] : []),
          ...(observe ? ["observe"] : []),
          ...(isTestMode && !serverTestPosture && !opts.isSsrTargetWebworker
            ? ["browser"]
            : []),
          ...config.resolve.conditions,
        ];
        if (
          (dev || observe) &&
          config.consumer !== "client" &&
          name !== "client"
        ) {
          config.resolve.externalConditions = [
            ...(dev ? ["development"] : []),
            ...(observe ? ["observe"] : []),
            ...(config.resolve.externalConditions ?? defaultExternalConditions),
          ];
          // Inline runtime consumers together so Node and Vite cannot load
          // separate development and production instances of Solid.
          if (!isTestMode && config.resolve.noExternal !== true) {
            const noExternal = config.resolve.noExternal;
            config.resolve.noExternal = [
              ...(Array.isArray(noExternal)
                ? noExternal
                : noExternal
                  ? [noExternal]
                  : []),
              ...SOLID_RUNTIME_PKGS,
            ];
          }
        }
        if (name === "ssr" && config.resolve.noExternal !== true) {
          const hostNoExternal = config.resolve.noExternal;
          const noExternal = [
            ...(Array.isArray(hostNoExternal)
              ? hostNoExternal
              : hostNoExternal
                ? [hostNoExternal]
                : []),
            ...solidPkgsConfig.ssr.noExternal,
          ];
          config.resolve.noExternal = noExternal;
          const keepsExternal = createFilter(undefined, noExternal, {
            resolve: false,
          });
          config.resolve.external = [
            ...(Array.isArray(config.resolve.external)
              ? config.resolve.external
              : []),
            ...solidPkgsConfig.ssr.external.filter((dep) => keepsExternal(dep)),
          ];
        }
      },
      async configResolved(config) {
        const { createFilter } = await import("vite");
        projectRoot = config.root;
        filter = createFilter(options.include, options.exclude, {
          resolve: projectRoot,
        });
        needHmr =
          config.command === "serve" &&
          config.mode !== "production" &&
          options.hot !== false &&
          !options.refresh?.disabled;
      },
      configureServer(server) {
        devServer = server;
        if (!needHmr) {
          return;
        }
        // Keep a syntax-error overlay from being replaced by a refresh reload.
        let lastErrorTime = 0;
        const send = server.hot.send.bind(server.hot);
        server.hot.send = (payload: HotPayload | string, data?: unknown) => {
          if (typeof payload === "object" && payload) {
            if (payload.type === "error") {
              lastErrorTime = Date.now();
            } else if (
              lastErrorTime &&
              (payload.type === "full-reload" || payload.type === "update")
            ) {
              if (Date.now() - lastErrorTime < 200) {
                return;
              }
              lastErrorTime = 0;
            }
          }

          if (typeof payload === "string") {
            return send(payload, data);
          }

          return send(payload);
        };
      },
      async hotUpdate({ file, modules, read }) {
        if (isTsrxModule(file) && this.environment.name === "client") {
          await compile(await read(), file, false);
          const cssModule = this.environment.moduleGraph.getModuleById(
            resolvedTsrxCssModuleId(file),
          );
          if (cssModule) {
            this.environment.moduleGraph.invalidateModule(cssModule);

            return modules.includes(cssModule)
              ? modules
              : [...modules, cssModule];
          }
        }
        if (
          this.environment.name !== "client" &&
          "runner" in this.environment
        ) {
          if (modules.length > 0) {
            this.environment.hot.send({ type: "full-reload" });
            const client = devServer.environments.client;
            if (client && !client.moduleGraph.getModulesByFile(file)?.size) {
              client.hot.send({ type: "full-reload" });
            }
          }

          return [];
        }
      },
      resolveId(id, importer, resolveOptions) {
        const cssId = resolveTsrxCssModule(id);
        if (cssId) {
          return cssId;
        }
        if (id !== "server-only" && id !== "client-only") {
          return null;
        }
        const scan = (resolveOptions as { scan?: boolean }).scan;
        const server = isServerEnvironment(this, resolveOptions);
        if (!scan && (id === "server-only" ? !server : server)) {
          this.error(
            `[unplugin-solid] Cannot import '${id}' in a ${server ? "server" : "client"} module: ${importer}`,
          );
        }

        return BOUNDARY_MODULE_ID;
      },
      load(id) {
        if (id === BOUNDARY_MODULE_ID) {
          return "export {}";
        }
        const source = tsrxCssSourceId(id);
        if (source) {
          return tsrxCss.get(source) ?? "";
        }
      },
      async transform(source, id, transformOptions) {
        if (!filter(id)) {
          return null;
        }
        const ssr = isServerEnvironment(this, transformOptions);
        const result = await compile(source, id, ssr);
        if (!result) {
          return null;
        }
        // Match the native lazy transform's placeholder contract. Queries
        // remain part of module identity for client manifests and dev URLs.
        const placeholders = result.code.matchAll(
          new RegExp(`"${LAZY_PLACEHOLDER_PREFIX}([^"]+)"`, "g"),
        );
        for (const match of placeholders) {
          const resolved = await this.resolve(match[1], cleanModuleId(id));
          if (resolved) {
            const file = cleanModuleId(resolved.id);
            const query = resolved.id.slice(file.length);
            const relative =
              path.relative(projectRoot, file).split(path.sep).join("/") +
              query;
            result.code = result.code.replace(
              match[0],
              JSON.stringify(relative),
            );
          }
        }
        if (
          ssr &&
          !id.includes("node_modules") &&
          !result.code.includes("$$moduleUrl")
        ) {
          const file = cleanModuleId(id);
          const relative =
            path.relative(projectRoot, file).split(path.sep).join("/") +
            id.slice(file.length);
          result.code += `\nexport const $$moduleUrl = ${JSON.stringify(relative)};\n`;
        }

        return result;
      },
    },
  };
};

export const unplugin: UnpluginInstance<Options | undefined, false> =
  /* #__PURE__ */ createUnplugin(unpluginFactory);
export default unplugin;
