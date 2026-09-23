// Adapted from solidjs/solid-vite-plugin at c94fcf351cb5e8392fc8c3d5085886b943dc2725 (MIT).
import { existsSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const NON_RUNTIME_SOLID_PKGS = [
  "unplugin-solid",
  "@solidjs/vite-plugin",
  "vite",
  "vitest",
  "eslint-plugin-solid",
];
const NON_RUNTIME_SOLID_PREFIXES = [
  "vite-plugin-",
  "eslint-plugin-",
  "prettier-plugin-",
  "@types/",
];

export function isNonRuntimeSolidPkg(name: string): boolean {
  const bare = name.slice(name.lastIndexOf("/") + 1);

  return (
    NON_RUNTIME_SOLID_PKGS.includes(name) ||
    NON_RUNTIME_SOLID_PREFIXES.some((p) =>
      (p.startsWith("@") ? name : bare).startsWith(p),
    )
  );
}

export function containsSolidField(fields: Record<string, any>): boolean {
  const keys = Object.keys(fields);
  for (const key of keys) {
    if (key === "solid") {
      return true;
    }
    if (
      typeof fields[key] === "object" &&
      fields[key] != null &&
      containsSolidField(fields[key])
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Locate a bare package the way Vite (and Node without `NODE_PATH`) does: walk
 * `<dir>/node_modules/<name>` up from `root`. `require.resolve` can't be used
 * for this — it also consults `NODE_PATH`, which pnpm's bin shims (`pnpm
 * vitest`, `pnpm test`) point at the hoisted virtual store
 * (`node_modules/.pnpm/node_modules`), where every transitive dependency of the
 * whole tree is reachable.
 */
function findPackageDir(name: string, root: string): string | undefined {
  let dir = root;
  while (true) {
    const candidate = path.join(dir, "node_modules", name);
    if (existsSync(path.join(candidate, "package.json"))) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

export function getJestDomExport(
  setupFiles: string[],
  root: string,
): string | undefined {
  if (setupFiles?.some((file) => /jest-dom/.test(file))) {
    return undefined;
  }

  // Resolve from the project root, not from this plugin's own location. With pnpm's
  // isolated node_modules layout the plugin can reach a jest-dom that only exists as a
  // transitive dependency (e.g. of Storybook), while Vitest resolves `setupFiles` from the
  // project root, where it isn't installed, and fails to load it.
  // https://github.com/solidjs/solid-vite-plugin/issues/231
  // The bare specifier (not the resolved path) is injected on purpose: `require.resolve` picks
  // jest-dom's CommonJS entry, which Vitest refuses to load, while Vitest itself resolves the
  // specifier to the ESM entry.
  const packageDir = findPackageDir("@testing-library/jest-dom", root);
  if (!packageDir) {
    return undefined;
  }
  // Check the subpath against THIS copy: resolving from inside the package
  // self-references its `exports` map (v6+), or falls back to its own files
  // for versions without one (v5's `extend-expect`). `NODE_PATH` still
  // participates in that lookup, so make sure the hit landed in the package
  // Vite will resolve rather than in some hoisted copy of another version.
  const realPackageDir = realpathSync(packageDir);
  const packageRequire = createRequire(path.join(packageDir, "package.json"));

  return [
    "@testing-library/jest-dom/vitest",
    "@testing-library/jest-dom/extend-expect",
  ].find((specifier) => {
    try {
      const resolved = realpathSync(packageRequire.resolve(specifier));

      return resolved.startsWith(realPackageDir + path.sep);
    } catch {
      return false;
    }
  });
}
