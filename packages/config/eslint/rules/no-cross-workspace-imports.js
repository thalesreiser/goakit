// Reports relative imports that leave the current workspace and land in an
// app: `apps/a` -> `apps/b`, or `packages/*` -> `apps/*`. Imports by package
// name (`@goakit/mobile`) are covered by `no-restricted-imports` in
// boundaries.js; this rule covers paths such as `../../../api/src/x`, which no
// name pattern can tell apart from an import inside the same workspace.
const fs = require('node:fs');
const path = require('node:path');

const WORKSPACE_GROUPS = new Set(['apps', 'packages']);
const workspaceCache = new Map();

// Nearest directory with a package.json, if it sits directly in apps/ or
// packages/. Returns null for files outside any workspace (the repo root).
function findWorkspace(dir) {
  if (workspaceCache.has(dir)) return workspaceCache.get(dir);
  let result = null;
  if (fs.existsSync(path.join(dir, 'package.json'))) {
    const group = path.basename(path.dirname(dir));
    if (WORKSPACE_GROUPS.has(group)) {
      result = {
        dir,
        group,
        name: path.basename(dir),
        root: path.dirname(path.dirname(dir)),
      };
    }
  } else {
    const parent = path.dirname(dir);
    if (parent !== dir) result = findWorkspace(parent);
  }
  workspaceCache.set(dir, result);
  return result;
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow relative imports from one app into another, or from a package into an app.',
    },
    schema: [],
    messages: {
      appToApp:
        '\'{{source}}\' resolves into apps/{{target}}. An app must not import another app (apps/{{current}} -> apps/{{target}}). Move shared code to a package under packages/. See "Package boundaries" in AGENTS.md.',
      packageToApp:
        '\'{{source}}\' resolves into apps/{{target}}. A package must not import an app (packages/{{current}} -> apps/{{target}}). Move the code into a package. See "Package boundaries" in AGENTS.md.',
    },
  },
  create(context) {
    const filename = context.physicalFilename ?? context.filename;
    if (!path.isAbsolute(filename)) return {};
    const workspace = findWorkspace(path.dirname(filename));
    if (!workspace) return {};

    function check(node) {
      if (!node || node.type !== 'Literal' || typeof node.value !== 'string') return;
      const source = node.value;
      if (!source.startsWith('.') && !path.isAbsolute(source)) return;

      const target = path.resolve(path.dirname(filename), source);
      if (isInside(workspace.dir, target) || !isInside(workspace.root, target)) return;

      const [group, name] = path.relative(workspace.root, target).split(/[\\/]/);
      // Only real apps: a path such as `../../apps/x` from inside an app does
      // not reach apps/x and is left to the module resolver.
      if (group !== 'apps' || !name || !fs.existsSync(path.join(workspace.root, 'apps', name))) {
        return;
      }

      context.report({
        node,
        messageId: workspace.group === 'apps' ? 'appToApp' : 'packageToApp',
        data: { source, current: workspace.name, target: name },
      });
    }

    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'require') {
          check(node.arguments[0]);
        }
      },
    };
  },
};
