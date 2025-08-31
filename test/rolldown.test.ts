import { rolldownBuild, testFixtures } from '@sxzz/test-utils'
import { describe } from 'vitest'

import Solid from '../src/rolldown'

async function getCode(file: string, plugin: any) {
  const bundle = await rolldownBuild(file, [plugin])

  return bundle.snapshot
}

describe('rolldown', async () => {
  await testFixtures(
    'test/fixtures/*.{js,ts,jsx,tsx}',
    async (args, id) => {
      const unpluginCode = await getCode(
        id,
        Solid({
          dev: args.dev,
        }),
      )

      return unpluginCode.replaceAll(
        /(["']__file["']\s*,\s*['"]).*?(['"])/g,
        (_, s1, s2) => `${s1}#FILE#${s2}`,
      )
    },
    {
      params: [['dev', [true, false]]],
      promise: true,
    },
  )
})
