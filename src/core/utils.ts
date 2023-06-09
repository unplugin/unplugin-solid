import { createRequire } from "node:module";

import type { Alias, AliasOptions } from "vite";

const require = createRequire(import.meta.url);

export function getExtension(filename: string): string {
  const index = filename.lastIndexOf(".");

  return index < 0
    ? ""
    : filename.slice(Math.max(0, index)).replace(/\?.+$/, "");
}

export function containsSolidField(fields: any) {
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

export function isJestDomInstalled() {
  try {
    // attempt to reference a file that will not throw error because expect is missing
    require("@testing-library/jest-dom/dist/utils");

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * This basically normalize all aliases of the config into the array format of
 * the alias.
 *
 * Eg: alias: { '@': 'src/' } => [{ find: '@', replacement: 'src/' }]
 */
export const normalizeAliases = (alias: AliasOptions = []): Alias[] =>
  Array.isArray(alias)
    ? alias
    : Object.entries(alias).map(([find, replacement]) => ({
        find,
        replacement,
      }));
