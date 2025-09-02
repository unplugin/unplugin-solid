import { createRequire } from "node:module";

import type { Alias, AliasOptions } from "vite";

export const require: NodeJS.Require = createRequire(import.meta.url);

export function getExtension(filename: string): string {
	const index = filename.lastIndexOf(".");

	return index === -1
		? ""
		: filename.slice(Math.max(0, index)).replace(/\?.+$/, "");
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

export const getJestDomExport = (setupFiles: string[]): string | undefined =>
	setupFiles?.some((path) => /jest-dom/.test(path))
		? undefined
		: [
				"@testing-library/jest-dom/vitest",
				"@testing-library/jest-dom/extend-expect",
			].find((path) => {
				try {
					require.resolve(path);

					return true;
				} catch {
					return false;
				}
			});

/**
 * This basically normalize all aliases of the config into
 * the array format of the alias.
 *
 * eg: alias: { '@': 'src/' } => [{ find: '@', replacement: 'src/' }]
 */
export const normalizeAliases = (alias: AliasOptions = []): Alias[] =>
	Array.isArray(alias)
		? alias
		: Object.entries(alias).map(([find, replacement]) => ({
				find,
				replacement,
			}));
