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
pnpm turbo run typecheck test
pnpm lint
pnpm turbo run expo:check
pnpm turbo run export
```

Format changed files with `pnpm format` (Prettier, shared config from `packages/config`); `pnpm format:check` reports unformatted files without writing. Formatting is not enforced in CI yet: the existing code is reformatted in a separate task (EST-01.4).

The [CI workflow](.github/workflows/ci.yml) runs the same checks on every pull request and is the source of truth; a pull request is ready for review only when CI is green.

`expo export` only proves that the JavaScript bundles build. It is not a device test. In the pull request, state exactly where the change was exercised (web preview, Android device, iOS device) and leave the others unticked.

## Language

Repository documentation, commits, branch names, and pull requests are in English. The app interface and mock content stay in Portuguese (pt-BR).

## Security

Do not open public issues for vulnerabilities; follow [SECURITY.md](SECURITY.md). Never commit secrets or real credentials, including in mock data.
