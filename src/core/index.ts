import { readFileSync } from "node:fs";

import type { TransformOptions } from "@babel/core";
import { transformAsync } from "@babel/core";
// @ts-expect-error
import solid from "babel-preset-solid";
import { mergeAndConcat } from "merge-anything";
// @ts-expect-error
import ts from "@babel/preset-typescript";
import { createUnplugin } from "unplugin";
import solidRefresh from "solid-refresh/babel";
import { createFilter } from "@rollup/pluginutils";
import type { UserConfig } from "vite";
import { crawlFrameworkPkgs } from "vitefu";

import type { Options } from "./types";
import {
  containsSolidField,
  getExtension,
  isJestDomInstalled,
  normalizeAliases,
} from "./utils";

const runtimePublicPath = "/@solid-refresh";
const runtimeFilePath = require.resolve("solid-refresh/dist/solid-refresh.mjs");
const runtimeCode = readFileSync(runtimeFilePath, "utf-8");

export default createUnplugin<Partial<Options> | undefined>(
  (options = {}, meta) => {
    const filter = createFilter(options.include, options.exclude);

    const isVite = meta.framework === "vite";
    let needHmr = false;
    let replaceDev = false;
    let projectRoot = process.cwd();

    return {
      name: "unplugin-solid",
      enforce: "pre",

      vite: {
        async config(userConfig, { command }) {
          // We inject the dev mode only if the user explicitely wants it or if we are in dev (serve) mode
          replaceDev =
            options.dev === true ||
            (options.dev !== false && command === "serve");
          projectRoot = userConfig.root ?? projectRoot;

          if (!userConfig.resolve) {
            userConfig.resolve = {};
          }
          userConfig.resolve.alias = normalizeAliases(userConfig.resolve.alias);

          const solidPkgsConfig = await crawlFrameworkPkgs({
            viteUserConfig: userConfig,
            root: projectRoot || process.cwd(),
            isBuild: command === "build",
            isFrameworkPkgByJson(pkgJson) {
              return containsSolidField(pkgJson.exports || {});
            },
          });

          // fix for bundling dev in production
          const nestedDeps = replaceDev
            ? [
                "solid-js",
                "solid-js/web",
                "solid-js/store",
                "solid-js/html",
                "solid-js/h",
              ]
            : [];

          const test =
            userConfig.mode === "test"
              ? {
                  test: {
                    globals: true,
                    ...(options.ssr ? {} : { environment: "jsdom" }),
                    transformMode: {
                      [options.ssr ? "ssr" : "web"]: [/\.[jt]sx?$/],
                    },
                    ...(isJestDomInstalled()
                      ? {
                          setupFiles: [
                            "node_modules/@testing-library/jest-dom/extend-expect.js",
                          ],
                        }
                      : {}),
                    deps: { registerNodeLoader: true },
                    ...(
                      userConfig as UserConfig & { test: Record<string, any> }
                    ).test,
                  },
                }
              : {};

          return {
            /**
             * We only need esbuild on .ts or .js files. .tsx & .jsx files are
             * handled by us
             */
            esbuild: { include: /\.ts$/ },
            resolve: {
              conditions: [
                "solid",
                ...(isVite && replaceDev ? ["development"] : []),
                ...(userConfig.mode === "test" && !options.ssr
                  ? ["browser"]
                  : []),
              ],
              dedupe: nestedDeps,
              alias: [
                { find: /^solid-refresh$/, replacement: runtimePublicPath },
              ],
            },
            optimizeDeps: {
              include: [...nestedDeps, ...solidPkgsConfig.optimizeDeps.include],
              exclude: solidPkgsConfig.optimizeDeps.exclude,
            },
            ssr: solidPkgsConfig.ssr,
            ...test,
          };
        },

        configResolved(config) {
          needHmr =
            config.command === "serve" &&
            config.mode !== "production" &&
            options.hot !== false;
        },

        resolveId(id) {
          if (id === runtimePublicPath) {
            return id;
          }
        },

        load(id) {
          if (id === runtimePublicPath) {
            return runtimeCode;
          }
        },
      },
      async transform(source, id) {
        const isSsr = !!options.ssr;
        const currentFileExtension = getExtension(id);

        const extensionsToWatch = [
          ...(options.extensions ?? []),
          ".tsx",
          ".jsx",
        ];
        const allExtensions = extensionsToWatch.map((extension) =>
          // An extension can be a string or a tuple [extension, options]
          typeof extension === "string" ? extension : extension[0],
        );

        if (!filter(id) || !allExtensions.includes(currentFileExtension)) {
          return null;
        }

        const inNodeModules = /node_modules/.test(id);

        let solidOptions: { generate: "ssr" | "dom"; hydratable: boolean };

        if (options.ssr) {
          solidOptions = isSsr
            ? { generate: "ssr", hydratable: true }
            : { generate: "dom", hydratable: true };
        } else {
          solidOptions = { generate: "dom", hydratable: false };
        }

        id = id.replace(/\?.+$/, "");

        const opts: TransformOptions = {
          babelrc: false,
          configFile: false,
          root: projectRoot,
          filename: id,
          sourceFileName: id,
          presets: [[solid, { ...solidOptions, ...(options.solid ?? {}) }]],
          plugins:
            isVite && needHmr && !isSsr && !inNodeModules
              ? [[solidRefresh, { bundler: "vite" }]]
              : [],
          sourceMaps: true,
          // Vite handles sourcemap flattening
          inputSourceMap: false as any,
        };

        // We need to know if the current file extension has a typescript options tied to it
        const shouldBeProcessedWithTypescript = extensionsToWatch.some(
          (extension) => {
            if (typeof extension === "string") {
              return extension.includes("tsx");
            }

            const [extensionName, extensionOptions] = extension;
            if (extensionName !== currentFileExtension) {
              return false;
            }

            return extensionOptions.typescript;
          },
        );

        if (shouldBeProcessedWithTypescript) {
          (opts.presets ??= []).push([ts, options.typescript ?? {}]);
        }

        // Default value for babel user options
        let babelUserOptions: TransformOptions = {};

        if (options.babel) {
          if (typeof options.babel === "function") {
            const babelOptions = options.babel(source, id, isSsr);
            babelUserOptions =
              babelOptions instanceof Promise
                ? await babelOptions
                : babelOptions;
          } else {
            babelUserOptions = options.babel;
          }
        }

        const babelOptions = mergeAndConcat(babelUserOptions, opts);

        const { code, map } = (await transformAsync(source, babelOptions))!;

        return { code: code!, map };
      },
    };
  },
);
