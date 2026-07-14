import { so1ve } from "@so1ve/eslint-config";

export default so1ve({
  ignores: ["**/fixtures/**"],
  overrides: {
    test: {
      "vitest/no-standalone-expect": "off",
    },
  },
});
