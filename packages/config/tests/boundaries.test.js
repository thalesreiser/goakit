// Lints code snippets against the boundary presets. The fixture workspace
// mirrors the monorepo layout (apps/a, apps/b, packages/p), so nothing that
// violates a boundary has to be committed as real source.
const assert = require('node:assert/strict');
const path = require('node:path');
const { describe, it } = require('node:test');
const { ESLint } = require('eslint');
const boundaries = require('../eslint/boundaries');

const root = path.join(__dirname, 'fixtures', 'workspace');

async function lint(preset, file, code) {
  const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: preset });
  const [result] = await eslint.lintText(code, { filePath: path.join(root, file) });
  return result.messages.map(({ ruleId, message }) => ({ ruleId, message }));
}

async function assertFails(preset, file, code, ruleId, text) {
  const messages = await lint(preset, file, code);
  assert.equal(
    messages.length,
    1,
    `expected one error for ${code}, got ${JSON.stringify(messages)}`,
  );
  assert.equal(messages[0].ruleId, ruleId);
  assert.match(messages[0].message, text);
}

async function assertPasses(preset, file, code) {
  assert.deepEqual(await lint(preset, file, code), [], code);
}

describe('boundaries.app', () => {
  const file = 'apps/a/src/index.js';

  it('rejects importing another app by package name', async () => {
    for (const name of ['@goakit/mobile', '@goakit/api/src/main', '@goakit/web']) {
      await assertFails(
        boundaries.app,
        file,
        `import x from '${name}';`,
        'no-restricted-imports',
        /An app must not import an app/,
      );
    }
  });

  it('rejects relative imports into another app', async () => {
    for (const code of [
      "import x from '../../b/src/x';",
      "export * from '../../b';",
      "const x = require('../../../apps/b/index.js');",
      "const x = import('../../b/src/x');",
    ]) {
      await assertFails(
        boundaries.app,
        file,
        code,
        '@goakit/no-cross-workspace-imports',
        /An app must not import another app \(apps\/a -> apps\/b\)/,
      );
    }
  });

  it('allows its own files, packages and libraries', async () => {
    await assertPasses(
      boundaries.app,
      file,
      [
        "import a from './a';",
        "import b from '../lib/b';",
        "import p from '../../../packages/p/src';",
        "import d from '@goakit/domain';",
        "import r from 'react';",
      ].join('\n'),
    );
  });
});

describe('boundaries.package', () => {
  const file = 'packages/p/src/index.js';

  it('rejects importing an app', async () => {
    await assertFails(
      boundaries.package,
      file,
      "import x from '@goakit/mobile';",
      'no-restricted-imports',
      /A package must not import an app/,
    );
    await assertFails(
      boundaries.package,
      file,
      "import x from '../../../apps/a/src/x';",
      '@goakit/no-cross-workspace-imports',
      /A package must not import an app \(packages\/p -> apps\/a\)/,
    );
  });

  it('allows other packages and libraries', async () => {
    await assertPasses(
      boundaries.package,
      file,
      "import d from '@goakit/domain';\nimport r from 'react';",
    );
  });
});

describe('boundaries.domain', () => {
  const file = 'packages/p/src/index.js';

  it('rejects UI, network, SDK and Node I/O imports', async () => {
    const cases = [
      ['react', /free of UI code/],
      ['react/jsx-runtime', /free of UI code/],
      ['react-native', /free of UI code/],
      ['react-native-svg', /free of UI code/],
      ['expo', /free of UI code/],
      ['expo-sqlite', /free of UI code/],
      ['@expo/vector-icons', /free of UI code/],
      ['next/link', /free of UI code/],
      ['@gluestack-ui/core', /free of UI code/],
      ['axios', /must not do networking/],
      ['ky', /must not do networking/],
      ['@nestjs/common', /server frameworks, SDKs or storage/],
      ['drizzle-orm', /server frameworks, SDKs or storage/],
      ['node:fs', /Node\.js I\/O modules/],
      ['http', /Node\.js I\/O modules/],
      ['@goakit/api', /A package must not import an app/],
    ];
    for (const [name, text] of cases) {
      await assertFails(
        boundaries.domain,
        file,
        `import x from '${name}';`,
        'no-restricted-imports',
        text,
      );
    }
  });

  it('rejects network and storage globals', async () => {
    await assertFails(
      boundaries.domain,
      file,
      "fetch('/v1/lists');",
      'no-restricted-globals',
      /global 'fetch'/,
    );
  });

  it('allows pure code', async () => {
    await assertPasses(
      boundaries.domain,
      file,
      [
        "import { a } from './a';",
        "import { b } from '../lib/b';",
        "import { c } from '@goakit/tokens';",
        "import { d } from 'date-fns';",
        "import { e } from 'reactive-lib';",
        "import { f } from 'nextgen';",
      ].join('\n'),
    );
  });
});
