import type { TransformOptions } from "@babel/core";
import type { TransformOptions as CompilerOptions } from "@solidjs/compiler";
import type { FilterPattern } from "unplugin";

export type Compiler = "native" | "babel";
export type SolidOptions = Omit<CompilerOptions, "filename" | "sourceMap">;

export interface ExtensionOptions {
  typescript?: boolean;
}

export interface RefreshOptions {
  /**
   * Disable Vite's development refresh transform.
   */
  disabled?: boolean;
  /**
   * Preserve unchanged components when updating a module. @default true
   */
  granular?: boolean;
}

export interface Options {
  /**
   * Files to compile. Vite resolves relative patterns against its project root.
   */
  include?: FilterPattern;
  /**
   * Files to skip.
   */
  exclude?: FilterPattern;
  /**
   * JSX compiler backend. @default "native"
   */
  compiler?: Compiler;
  /**
   * Compiler development output. Enabled by default during Vite development.
   */
  dev?: boolean;
  /**
   * Keep component names and select Vite's observable runtime builds.
   */
  observe?: boolean;
  /**
   * Compile for server rendering. In Vite, client modules are hydratable and
   * server modules use SSR code generation. Other bundlers produce server
   * code.
   *
   * @default false
   */
  ssr?: boolean;
  /**
   * Enable Vite refresh. @deprecated Use `refresh.disabled` instead.
   */
  hot?: boolean;
  /**
   * Vite refresh options.
   */
  refresh?: RefreshOptions;
  /**
   * Additional source extensions. Vite also handles `.tsrx` automatically.
   */
  extensions?: (string | [string, ExtensionOptions])[];
  /**
   * Custom Babel transforms. With the native compiler, these run before JSX
   * compilation, or after lowering TSRX to ordinary TypeScript.
   */
  babel?:
    | TransformOptions
    | ((
        source: string,
        id: string,
        ssr: boolean,
      ) => TransformOptions | Promise<TransformOptions>);
  /**
   * Options passed to the Solid JSX compiler.
   */
  solid?: SolidOptions;
}
