// Adapted from solidjs/solid-vite-plugin at c94fcf351cb5e8392fc8c3d5085886b943dc2725 (MIT).
export const TSRX_CSS_QUERY = "?solid-tsrx-css&lang.css";

const NULL_BYTE_PLACEHOLDER = "/@id/__x00__";

export function cleanModuleId(id: string): string {
  const query = id.indexOf("?");

  return query === -1 ? id : id.slice(0, query);
}

export const isTsrxModule = (id: string): boolean =>
  cleanModuleId(id).toLowerCase().endsWith(".tsrx");

export function isTsrxCssModule(id: string): boolean {
  const unwrapped = id.startsWith("\0")
    ? id.slice(1)
    : id.startsWith(NULL_BYTE_PLACEHOLDER)
      ? id.slice(NULL_BYTE_PLACEHOLDER.length)
      : id;
  const queryIndex = unwrapped.indexOf("?");
  if (
    queryIndex === -1 ||
    !unwrapped.slice(0, queryIndex).toLowerCase().endsWith(".tsrx")
  ) {
    return false;
  }
  const params = unwrapped.slice(queryIndex + 1).split("&");

  return params.includes("solid-tsrx-css") && params.includes("lang.css");
}

export function resolveTsrxCssModule(id: string): string | null {
  if (!isTsrxCssModule(id)) {
    return null;
  }
  if (id.startsWith("\0")) {
    return id;
  }
  if (id.startsWith(NULL_BYTE_PLACEHOLDER)) {
    return `\0${id.slice(NULL_BYTE_PLACEHOLDER.length)}`;
  }

  return `\0${id}`;
}

export const tsrxCssModuleId = (id: string): string =>
  cleanModuleId(id) + TSRX_CSS_QUERY;

export const resolvedTsrxCssModuleId = (id: string): string =>
  `\0${tsrxCssModuleId(id)}`;

export function tsrxCssSourceId(id: string): string | null {
  if (!id.startsWith("\0") || !isTsrxCssModule(id)) {
    return null;
  }

  return cleanModuleId(id.slice(1));
}

export function updateTsrxCss(
  cache: Map<string, string>,
  id: string,
  css: string | null | undefined,
): void {
  const key = cleanModuleId(id);
  if (css) {
    cache.set(key, css);
  } else {
    cache.delete(key);
  }
}

export const prependTsrxCssImport = (code: string, id: string): string =>
  `import ${JSON.stringify(tsrxCssModuleId(id))};\n${code}`;

export function offsetSourceMapLine<T>(map: T): T {
  if (
    map &&
    typeof map === "object" &&
    "mappings" in map &&
    typeof (map as { mappings?: unknown }).mappings === "string"
  ) {
    return {
      ...map,
      mappings: `;${(map as { mappings: string }).mappings}`,
    };
  }
  if (
    map &&
    typeof map === "object" &&
    "sections" in map &&
    Array.isArray((map as { sections?: unknown }).sections)
  ) {
    return {
      ...map,
      sections: (
        map as { sections: { offset: { line: number; column: number } }[] }
      ).sections.map((section) => ({
        ...section,
        offset: { ...section.offset, line: section.offset.line + 1 },
      })),
    };
  }

  return map;
}
