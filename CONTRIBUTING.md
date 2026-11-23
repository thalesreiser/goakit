# Contributing to Goakit

Gabriel owns the product and its decisions. Read [AGENTS.md](AGENTS.md) and the documents in [`docs/`](docs/) before changing functionality; they apply to people and tools alike.

## Workflow

The repository is trunk-based: `main` is always releasable and every change reaches it through a pull request.

1. Create a short-lived branch from an up-to-date `main`, named with one of these prefixes: `feat/`, `fix/`, `docs/`, `chore/`, `ci/`, `test/`, `refactor/`, `style/`, `build/` (for example `feat/quiz-nights`).
2. Keep one topic per pull request. Unrelated fixes go in their own branch.
3. Put dependency changes (`package.json` files, `pnpm-lock.yaml`, Expo SDK upgrades) in their own pull request, installed with `pnpm --filter @goakit/mobile exec expo install` or `pnpm --filter <package> add` so the lockfile stays consistent.
4. Title the pull request in [Conventional Commits](https://www.conventionalcommits.org/) form, such as `feat: add quiz nights step`. Pull requests are squash-merged and the title becomes the commit message on `main`.
5. Fill in the pull request template, including what was actually verified.
6. Never merge your own pull request. Another person must approve it first.

## Decisions before code

Product rules live in [docs/decisions.md](docs/decisions.md). Before implementing behavior that depends on an open question (Q01–Q15), record the decision, or an explicitly temporary agreement for the demonstration, in that file and reference its ID in the pull request. Do not settle an open question through a code default.

Respect the invariants in [AGENTS.md](AGENTS.md): binary personal progress, independent copies, adaptations only when accepted, and shareable output built as an explicit projection without progress or private items.

## Verification

Run the checks listed in the [README](README.md#verification):

```sh
pnpm format:check
pnpm turbo run typecheck test
pnpm lint
pnpm turbo run expo:check
pnpm turbo run export
```

Format changed files with `pnpm format` (Prettier, shared config from `packages/config`); `pnpm format:check` reports unformatted files without writing, and CI runs it on every pull request.

The commit that first formatted the whole codebase is listed in [`.git-blame-ignore-revs`](.git-blame-ignore-revs). GitHub's blame view skips it automatically; to skip it in local `git blame`, run once:

```sh
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

The [CI workflow](.github/workflows/ci.yml) runs the same checks on every pull request and is the source of truth; a pull request is ready for review only when CI is green.

### Continuous integration

CI runs one job per check: `Format`, `Lint`, `Typecheck`, `Test` (with the coverage gate below), `Build` (`build` and `export`) and `Expo dependency check`. On a pull request, each Turborepo task runs only in the packages affected by the change and their dependents (`turbo run <task> --affected`, compared with the pull request's base commit); a change to `turbo.json`, `.nvmrc`, the root `package.json`, `pnpm-workspace.yaml` or the CI files affects every package. Pushes to `main` run every task in every package. Task results are cached between runs in the local Turborepo cache (`.turbo/cache`), restored per job. The `ci-ok` job summarises the result and fails if any other job failed or was cancelled; it is the check to require on `main`.

#### Test coverage

`test` runs with coverage in every package that has a bar, so the `Test` job fails when a change drops a package below its layer's minimum; the error line starts with the package name (`@goakit/api:test: ...`). The minimums are in `@goakit/config/vitest/coverage` (`COVERAGE_THRESHOLDS`) and apply to lines, statements, functions and branches:

| Layer    | Minimum | Workspaces                  | Measured                                                                           |
| -------- | ------- | --------------------------- | ---------------------------------------------------------------------------------- |
| `domain` | 90%     | `packages/domain` (planned) | `src/**/*.ts`                                                                      |
| `api`    | 80%     | `apps/api`                  | `src/**/*.ts`, except the entry points `src/main.ts` and `src/openapi/generate.ts` |
| `app`    | 70%     | `apps/mobile`               | `src/features/**/*.ts` (lines, branches, functions)                                |

- Vitest workspaces build their options from the preset. When you create `packages/domain`, add `@vitest/coverage-v8` (same version as `vitest`) and use `coverage: coverage('domain')` in `test` of its `vitest.config.mts`, as `apps/api/vitest.config.mts` does with `'api'`.
- `apps/mobile` uses the Node.js test runner (`--experimental-test-coverage` and `--test-coverage-*` flags in its `test` script), so its 70% is repeated there; keep it equal to `COVERAGE_THRESHOLDS.app`. React components cannot run under `node:test`, so only the pure logic in `src/features/**/*.ts` (today `features/checklists/model.ts`) is measured. The Node.js runner reports only files the tests load: a new `.ts` module under `src/features/` counts once a test imports it.
- `packages/config` has no bar: its tests lint fixtures against the shared presets, and the rest of the package is declarative configuration.
- Each package writes its report to `coverage/` (ignored by Git, Prettier and ESLint; a Turborepo output). CI uploads them as the `coverage` artifact of the `Test` job.
- Do not lower a bar to make a pull request pass; add tests, or raise it with Thales as a decision.

Pin every action you add to `.github` by its full commit SHA with a version comment (`owner/repo@<sha> # v1.2.3`); the `Actions pinned` check fails on tag or branch references. Local actions (`./.github/actions/...`) are exempt.

`expo export` only proves that the JavaScript bundles build. It is not a device test. In the pull request, state exactly where the change was exercised (web preview, Android device, iOS device) and leave the others unticked.

## Language

Repository documentation, commits, branch names, and pull requests are in English. The app interface and mock content stay in Portuguese (pt-BR).

## Security

Do not open public issues for vulnerabilities; follow [SECURITY.md](SECURITY.md). Never commit secrets or real credentials, including in mock data.
