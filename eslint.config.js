import { so1ve } from "@so1ve/eslint-config";

export default so1ve({
  ignores: ["**/fixtures/**"],
  overrides: {
    test: {
      "vitest/no-standalone-expect": "off",
    },
  },
}).override("so1ve/yaml/pnpm-workspace-yaml-sort", {
  rules: {
    "yaml/sort-keys": [
      "error",
      {
        order: [
          "gitChecks",
          "ignoreWorkspaceRootCheck",
          "allowBuilds",
          "shellEmulator",
          "packageExtensions",
        ],
        pathPattern: "^$",
      },
      {
        order: { type: "asc" },
        pathPattern: ".*",
      },
    ],
  },
});
