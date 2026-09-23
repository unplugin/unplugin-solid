# unplugin-solid

[![NPM version](https://img.shields.io/npm/v/unplugin-solid?color=a1b858&label=)](https://www.npmjs.com/package/unplugin-solid)

Solid 2 compilation for Vite, Rollup, Rolldown, webpack, Rspack, esbuild, and Astro, powered by unplugin.

## 📦 Installation

```bash
npm install -D unplugin-solid
npm install solid-js@^2.0.0-rc.9 @solidjs/web@^2.0.0-rc.9
```

For TypeScript projects, preserve JSX for the plugin and use the web runtime's JSX types:

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@solidjs/web"
  }
}
```

## 🚀 Usage

Add the adapter for your build tool to its configuration. Vite and Astro require Vite 8 or 9.

<details>
<summary>Vite</summary>

```ts
// vite.config.ts
import Solid from "unplugin-solid/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [Solid()],
});
```

</details>

<details>
<summary>Rollup</summary>

```js
// rollup.config.js
import Solid from "unplugin-solid/rollup";

export default {
  plugins: [Solid()],
};
```

</details>

<details>
<summary>Rolldown</summary>

```js
// rolldown.config.js
import Solid from "unplugin-solid/rolldown";

export default {
  plugins: [Solid()],
};
```

</details>

<details>
<summary>webpack</summary>

```js
// webpack.config.cjs
const Solid = require("unplugin-solid/webpack");

module.exports = {
  plugins: [Solid()],
};
```

</details>

<details>
<summary>Rspack</summary>

```js
// rspack.config.cjs
const Solid = require("unplugin-solid/rspack");

module.exports = {
  plugins: [Solid()],
};
```

</details>

<details>
<summary>esbuild</summary>

```js
// build.mjs
import { build } from "esbuild";
import Solid from "unplugin-solid/esbuild";

await build({
  entryPoints: ["src/index.tsx"],
  bundle: true,
  outdir: "dist",
  plugins: [Solid()],
});
```

</details>

<details>
<summary>Astro</summary>

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import Solid from "unplugin-solid/astro";

export default defineConfig({
  integrations: [Solid({})],
});
```

</details>

## ⚙️ Options

All adapters use the native Solid compiler by default. Pass `compiler: "babel"` to use the Babel compiler:

```ts
Solid({ compiler: "babel" });
```

Use `solid` to configure JSX compilation and `babel` to add Babel plugins or presets. With the native compiler, custom Babel transforms run before JSX compilation.

Vite and Astro support refresh, SSR compilation, and experimental TSRX. Compiling TSRX with the Babel backend also requires `@tsrx/core@0.1.63`. Use `refresh: { disabled: true }` to disable refresh, or `observe: true` to select Solid’s observable runtime builds.

The other adapters support JSX compilation options. Set `ssr: true` when compiling a server bundle and `dev: true` to enable compiler development output.

## 📝 License

[MIT](./LICENSE). Made with ❤️ by [Ray](https://github.com/so1ve)
