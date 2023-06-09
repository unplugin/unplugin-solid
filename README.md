# unplugin-solid

[![NPM version](https://img.shields.io/npm/v/unplugin-solid?color=a1b858&label=)](https://www.npmjs.com/package/unplugin-solid)

## 📦 Installation

```bash
$ npm install -D unplugin-solid
$ yarn add -D unplugin-solid
$ pnpm add -D unplugin-solid
```

## 🚀 Usage

<details>
<summary>Vite</summary><br>

```ts
// vite.config.ts
import Solid from "unplugin-solid/vite";

export default defineConfig({
  plugins: [
    Solid({
      /* options */
    }),
  ],
});
```

<br></details>

<details>
<summary>Rollup</summary><br>

```ts
// rollup.config.js
import Solid from "unplugin-solid/rollup";

export default {
  plugins: [
    Solid({
      /* options */
    }),
    // other plugins
  ],
};
```

<br></details>


<details>
<summary>Webpack</summary><br>

```ts
// webpack.config.js
module.exports = {
  /* ... */
  plugins: [
    require("unplugin-solid/webpack")({
      /* options */
    }),
  ],
};
```

<br></details>

<details>
<summary>Nuxt</summary><br>

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["unplugin-solid/nuxt"],
});
```

<br></details>

<details>
<summary>Vue CLI</summary><br>

```ts
// vue.config.js
module.exports = {
  configureWebpack: {
    plugins: [
      require("unplugin-solid/webpack")({
        /* options */
      }),
    ],
  },
};
```

<br></details>

<details>
<summary>Quasar</summary><br>

```ts
// quasar.conf.js [Vite]
module.exports = {
  vitePlugins: [
    [
      "unplugin-solid/vite",
      {
        /* options */
      },
    ],
  ],
};
```

```ts
// quasar.conf.js [Webpack]
const SolidPlugin = require("unplugin-solid/webpack");

module.exports = {
  build: {
    chainWebpack(chain) {
      chain.plugin("unplugin-solid").use(
        SolidPlugin({
          /* options */
        }),
      );
    },
  },
};
```

<br></details>

<details>
<summary>esbuild</summary><br>

```ts
// esbuild.config.js
import { build } from "esbuild";

build({
  /* ... */
  plugins: [
    require("unplugin-solid/esbuild")({
      /* options */
    }),
  ],
});
```

<br></details>


<details>
<summary>Astro</summary><br>

```ts
// astro.config.mjs
import Solid from "unplugin-solid/astro";

export default defineConfig({
  integrations: [
    Solid({
      /* options */
    }),
  ],
});
```

<br></details>

## 📝 License

[MIT](./LICENSE). Made with ❤️ by [Ray](https://github.com/so1ve)
