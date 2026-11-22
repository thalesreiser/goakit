# Goakit

A music festival checklist app for Android and iOS, initially focused on psytrance. Built with Expo, React Native, TypeScript, and Gluestack UI. Existing web support is for development previews; a complete web application is outside the scope.

## Project status

The first UI block was implemented from Paper: My lists, empty states, checklist, adding/editing/removing items, and progress. See [testing instructions and delivery limits](docs/implementation.md).

The interface uses mock data and in-memory state. The quiz, list reuse, privacy, and sharing are upcoming blocks and are not yet available. There is no backend, persistence, or live integration; Bruno will handle infrastructure later.

## Project foundations

- [Product and current scope](docs/product.md)
- [Organization, types, and technical boundaries](docs/architecture.md)
- [Confirmed decisions, proposals, and open questions](docs/decisions.md)
- [Architecture decision records (ADRs)](docs/decisions/README.md)
- [Delivery sequence, acceptance scenarios, and handoff to Bruno](docs/delivery.md)
- [Development and agent instructions](AGENTS.md)

The [main brief](https://docs.google.com/document/d/1bDFO0IcOABNzh1txCChQS_F3TNGzH141BjY0kG8kkes/edit) guides the product. Local documentation distinguishes the final product from the current prototype.

## Getting started

Use Node.js 22 (see `.nvmrc`) and pnpm (the version pinned in the root `package.json` `packageManager` field; `corepack enable` installs it).

```sh
nvm install
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @goakit/mobile run start
```

Open the QR code in an Expo Go version compatible with the installed SDK. In the terminal, press `a` for Android or `i` for the iOS simulator (macOS with Xcode). For web:

```sh
pnpm --filter @goakit/mobile run web
```

## Structure

The repository is a pnpm workspace orchestrated by Turborepo (`pnpm-workspace.yaml`, `turbo.json`). The Expo app is the only workspace package so far.

- `apps/mobile/`: the Expo app (`@goakit/mobile`).
  - `App.tsx`: providers and application entry point.
  - `components/ui/`: Gluestack components that can be customized.
  - `global.css`: styles and theme tokens.
  - `assets/`: images and icons.
  - `src/types/`: preliminary types used by screens and local state.
  - `src/features/checklists/`: screens, navigation, and local rules for the first flow.
  - `src/components/`: reusable application components.
  - `src/mocks/` and `src/theme/`: mock data and visual patterns from Paper.
  - `tests/`: Node test runner tests for the local rules.
- `docs/`: foundations, implementation, and planning.
- `.github/workflows/ci.yml`: automated type, test, dependency, and bundle checks.

## Verification

```sh
pnpm turbo run typecheck test
pnpm turbo run expo:check
pnpm turbo run export
```

`expo:check` runs `expo install --check` and `export` runs `expo export --platform all`, both in `apps/mobile`. Export checks JavaScript bundles; it does not produce store binaries or replace device testing.

To build and install on your iPhone from a Mac with a free Apple account, see [local iOS testing](docs/ios-local-testing.md). The initial iOS identifier is `com.gabrielguerguen.goakit`. The `pnpm --filter @goakit/mobile run ios:device` command uses the Release configuration, with the interface code bundled into the application; Xcode, CocoaPods, signing, and the device must be ready.

## Adding components

Before adding components, confirm a Gluestack CLI version compatible with the installed stack and use that version's `add` command. Review the generated diff; do not implicitly upgrade the stack to add a component.

The setup uses Gluestack UI v5 (presented as alpha by the installer). NativeWind `5.0.0-rc.0` and `react-native-css@3.1.0-rc.0` are pinned as a compatible pair of prerelease versions. Resolved versions are recorded in `pnpm-lock.yaml`; use `pnpm install --frozen-lockfile` to reproduce the installation. UniWind is not installed. The first block uses local navigation; Expo Router remains a proposal.

## Configuration

Copy `apps/mobile/.env.example` to `apps/mobile/.env` if you need environment variables. `EXPO_PUBLIC_` variables are available in the application and must not contain secrets. Never send tokens, passwords, or private keys to GitHub.

## Store distribution

The project is not yet linked to an Expo/EAS account. Before distribution, define Android and iOS identifiers, replace the default icons, and configure EAS and store credentials.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch, pull request, and verification workflow. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## References

- [Expo and TypeScript](https://docs.expo.dev/guides/typescript/)
- [Gluestack UI installation](https://v5.gluestack.io/ui/docs/home/getting-started/installation)

## Dependency status

During initial setup, `npm audit` reported 21 advisories in transitive Expo/Metro dependencies (7 moderate and 14 high). A fix without incompatible changes was attempted; the advisories remain. Review SDK updates before distributing the app. Do not automatically apply `npm audit fix --force`: the current suggestion includes downgrading to older versions of Expo.
