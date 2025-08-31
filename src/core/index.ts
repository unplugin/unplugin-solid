// Adapted from https://github.com/solidjs/vite-plugin-solid/blob/master/src/index.ts
import { readFileSync } from 'node:fs'

import type { TransformOptions } from '@babel/core'
import { transformAsync } from '@babel/core'
import { createFilter } from '@rollup/pluginutils'
// @ts-expect-error
import solid from 'babel-preset-solid'
import { mergeAndConcat } from 'merge-anything'
import solidRefresh from 'solid-refresh/babel'
import type { UnpluginInstance } from 'unplugin'
import { createUnplugin } from 'unplugin'
import { version } from 'vite'
import { crawlFrameworkPkgs } from 'vitefu'

import type { Options } from './types'
import {
  containsSolidField,
  getExtension,
  getJestDomExport,
  normalizeAliases,
  require,
} from './utils'

const runtimePublicPath = '/@solid-refresh'
const runtimeFilePath = require.resolve('solid-refresh/dist/solid-refresh.mjs')
const runtimeCode = readFileSync(runtimeFilePath, 'utf-8')

const SOLID_EXTERNALS = [
  'solid-js',
  'solid-js/web',
  'solid-js/store',
  'solid-js/html',
  'solid-js/h',
]

export const plugin: UnpluginInstance<Options | undefined, false> =
  createUnplugin((options = {}, meta) => {
    const filter = createFilter(options.include, options.exclude)

    let needHmr = false
    let replaceDev = false
    let projectRoot: string | undefined = process.cwd()
    let isTestMode = false

    return {
      name: 'unplugin-solid',
      enforce: 'pre',

      vite: {
        async config(userConfig, { command }) {
          // We inject the dev mode only if the user explicitly wants it or if we are in dev (serve) mode
          replaceDev =
            options.dev === true ||
            (options.dev !== false && command === 'serve')
          projectRoot = userConfig.root
          isTestMode = userConfig.mode === 'test'

          userConfig.resolve ??= {}
          userConfig.resolve.alias = normalizeAliases(
            userConfig.resolve && userConfig.resolve.alias,
          )

          const solidPkgsConfig = await crawlFrameworkPkgs({
            viteUserConfig: userConfig,
            root: projectRoot ?? process.cwd(),
            isBuild: command === 'build',
            isFrameworkPkgByJson(pkgJson) {
              return containsSolidField(pkgJson.exports ?? {})
            },
          })

          // fix for bundling dev in production
          const nestedDeps = replaceDev ? SOLID_EXTERNALS : []

          const userTest = (userConfig as any).test ?? {}
          const test = {} as any
          if (userConfig.mode === 'test') {
            // to simplify the processing of the config, we normalize the setupFiles to an array
            const userSetupFiles: string[] =
              typeof userTest.setupFiles === 'string'
                ? [userTest.setupFiles]
                : (userTest.setupFiles ?? [])

            if (!userTest.environment && !options.ssr) {
              test.environment = 'jsdom'
            }

            if (
              !userTest.server?.deps?.external?.find((item: string | RegExp) =>
                /solid-js/.test(item.toString()),
              )
            ) {
              test.server = { deps: { external: [/solid-js/] } }
            }
            if (!userTest.browser?.enabled) {
              // vitest browser mode already has bundled jest-dom assertions
              // https://main.vitest.dev/guide/browser/assertion-api.html#assertion-api
              const jestDomImport = getJestDomExport(userSetupFiles)
              if (jestDomImport) {
                test.setupFiles = [jestDomImport]
              }
            }
          }

          const isViteGreaterThan6 = +version.split('.')[0] >= 6

          return {
            /**
             * We only need esbuild on .ts or .js files.
             * .tsx & .jsx files are handled by us
             */
            // esbuild: { include: /\.ts$/ },
            resolve: {
              conditions: isViteGreaterThan6
                ? undefined
                : [
                    'solid',
                    ...(replaceDev ? ['development'] : []),
                    ...(userConfig.mode === 'test' && !options.ssr
                      ? ['browser']
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
            ...(test.server ? { test } : {}),
          }
        },

        async configEnvironment(name, config, opts) {
          config.resolve ??= {}
          // Emulate Vite default fallback for `resolve.conditions` if not set
          if (config.resolve.conditions == null) {
            const { defaultClientConditions, defaultServerConditions } =
              await import('vite')
            config.resolve.conditions =
              config.consumer === 'client' ||
              name === 'client' ||
              opts.isSsrTargetWebworker
                ? [...defaultClientConditions]
                : [...defaultServerConditions]
          }
          config.resolve.conditions = [
            'solid',
            ...(replaceDev ? ['development'] : []),
            ...(isTestMode && !opts.isSsrTargetWebworker ? ['browser'] : []),
            ...config.resolve.conditions,
          ]
        },

        configResolved(config) {
          needHmr =
            config.command === 'serve' &&
            config.mode !== 'production' &&
            options.hot !== false
        },

        resolveId(id) {
          if (id === runtimePublicPath) {
            return id
          }
        },

        load(id) {
          if (id === runtimePublicPath) {
            return runtimeCode
          }
        },
      },

      rolldown: {
        options(opts) {
          opts.external ??= SOLID_EXTERNALS
          opts.transform ??= {
            jsx: 'preserve',
          }
        },
      },

      async transform(source, id) {
        const isSsr = !!options.ssr
        const currentFileExtension = getExtension(id)

        const extensionsToWatch = options.extensions ?? []
        const allExtensions = extensionsToWatch.map((extension) =>
          // An extension can be a string or a tuple [extension, options]
          typeof extension === 'string' ? extension : extension[0],
        )

        if (!filter(id)) {
          return null
        }

        id = id.replace(/\?.*$/, '')

        if (
          !(
            /\.[mc]?[tj]sx$/i.test(id) ||
            allExtensions.includes(currentFileExtension)
          )
        ) {
          return null
        }

        const inNodeModules = /node_modules/.test(id)

        let solidOptions: { generate: 'ssr' | 'dom'; hydratable: boolean }

        if (options.ssr) {
          solidOptions = isSsr
            ? { generate: 'ssr', hydratable: true }
            : { generate: 'dom', hydratable: true }
        } else {
          solidOptions = { generate: 'dom', hydratable: false }
        }

        // We need to know if the current file extension has a typescript options tied to it
        const shouldBeProcessedWithTypescript =
          /\.[mc]?tsx$/i.test(id) ||
          extensionsToWatch.some((extension) => {
            if (typeof extension === 'string') {
              return extension.includes('tsx')
            }

            const [extensionName, extensionOptions] = extension
            if (extensionName !== currentFileExtension) {
              return false
            }

            return extensionOptions.typescript
          })
        const plugins: NonNullable<
          NonNullable<TransformOptions['parserOpts']>['plugins']
        > = ['jsx']

        if (shouldBeProcessedWithTypescript) {
          plugins.push('typescript')
        }

        const opts: TransformOptions = {
          root: projectRoot,
          filename: id,
          sourceFileName: id,
          presets: [[solid, { ...solidOptions, ...(options.solid ?? {}) }]],
          plugins:
            needHmr && !isSsr && !inNodeModules
              ? [[solidRefresh, { bundler: meta.framework }]]
              : [],
          ast: false,
          sourceMaps: true,
          configFile: false,
          babelrc: false,
          parserOpts: {
            plugins,
          },
        }

        // Default value for babel user options
        let babelUserOptions: TransformOptions = {}

        if (options.babel) {
          if (typeof options.babel === 'function') {
            const babelOptions = options.babel(source, id, isSsr)
            babelUserOptions =
              babelOptions instanceof Promise
                ? await babelOptions
                : babelOptions
          } else {
            babelUserOptions = options.babel
          }
        }

        const babelOptions = mergeAndConcat(babelUserOptions, opts)

        const { code, map } = (await transformAsync(source, babelOptions))!

        return { code: code!, map }
      },
    }
  })
