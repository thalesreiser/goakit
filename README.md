# Goakit

A music festival checklist app for Android and iOS, initially focused on psytrance. Built with Expo, React Native, TypeScript, and Gluestack UI. Existing web support is for development previews; a complete web application is outside the scope.

## Project status

The first UI block was implemented from Paper: My lists, empty states, checklist, adding/editing/removing items, and progress. See [testing instructions and delivery limits](docs/implementation.md).

The interface uses mock data and in-memory state. The quiz, list reuse, privacy, and sharing are upcoming blocks and are not yet available. The app has no backend connection, persistence, or live integration yet. The API in `apps/api` is a skeleton with configuration validation, a health check, a common error format, and an OpenAPI document; its only `/v1` route is a temporary diagnostic echo.

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

The repository is a pnpm workspace orchestrated by Turborepo (`pnpm-workspace.yaml`, `turbo.json`). The apps so far are the Expo app and the API skeleton; `packages/config` holds the shared tooling configuration.

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
- `apps/api/`: the REST API skeleton (`@goakit/api`), see [API](#api).
  - `src/main.ts`: process entry point; `src/app.ts`: builds the Nest application on Fastify.
  - `src/config/`: environment validation (Zod) and the injectable configuration.
  - `src/health/`: the `GET /health` route.
  - `src/problem/`: the Problem Details error format and the global exception filter; `src/validation/`: the Zod validation pipe.
  - `src/openapi/`: OpenAPI document generation; `src/echo/`: the temporary diagnostic route.
  - `test/`: Vitest unit and end-to-end tests.
- `packages/config/`: shared tooling configuration (`@goakit/config`): TypeScript (`tsconfig/strict.json`, `tsconfig/base.json`), ESLint flat configs (`eslint/base` for TypeScript packages, `eslint/expo` for Expo apps, built on `eslint-config-expo`), and Prettier (`prettier`).
- `docs/`: foundations, implementation, and planning.
- `.github/workflows/ci.yml`: automated format, type, test, lint, dependency, and bundle checks.

## Verification

```sh
pnpm format:check
pnpm turbo run typecheck test
pnpm lint
pnpm turbo run expo:check
pnpm turbo run export
```

`lint` runs ESLint in every workspace through Turborepo. Format with Prettier using `pnpm format` (writes) or `pnpm format:check` (reports only); both run at the repository root, over the whole repository, and honor `.prettierignore`. CI runs `pnpm format:check` right after install.

`test` also measures coverage and fails when a package is below its minimum: 80% for `apps/api` (Vitest, V8 provider), 70% for `apps/mobile` (Node.js test runner, pure logic in `src/features/**/*.ts` only). The coverage table is in the `test` output; see [CONTRIBUTING.md](CONTRIBUTING.md#test-coverage).

`expo:check` runs `expo install --check` and `export` runs `expo export --platform all`, both in `apps/mobile`. Export checks JavaScript bundles; it does not produce store binaries or replace device testing.

To build and install on your iPhone from a Mac with a free Apple account, see [local iOS testing](docs/ios-local-testing.md). The initial iOS identifier is `com.gabrielguerguen.goakit`. The `pnpm --filter @goakit/mobile run ios:device` command uses the Release configuration, with the interface code bundled into the application; Xcode, CocoaPods, signing, and the device must be ready.

## API

`apps/api` (`@goakit/api`) is the backend skeleton: NestJS 11 with the Fastify adapter ([ADR 0002](docs/decisions/0002-backend-typescript-nestjs.md)). It has no business routes, database, or authentication yet.

- Business routes will live under the `/v1` prefix. `GET /health` stays outside it, unversioned, and returns `200` with `{ "status": "ok", "uptime": <seconds> }`.
- `POST /v1/echo` is a temporary diagnostic route, not a business route: it returns `{ "message": ... }` built from a body `{ "message": string (1-280), "repeat"?: 1-3 }` and an optional `?uppercase=true|false`. It exists to exercise validation, errors, and OpenAPI end to end, and will be removed when the first real `/v1` route lands.
- The environment is validated with Zod at startup. If a required variable is missing or a value is invalid, the process exits with code 1 and lists every problem.

| Variable    | Required | Default   | Values                                                       |
| ----------- | -------- | --------- | ------------------------------------------------------------ |
| `NODE_ENV`  | yes      |           | `development`, `test`, `production`                          |
| `PORT`      | yes      |           | integer from 1 to 65535                                      |
| `HOST`      | no       | `0.0.0.0` | interface to bind                                            |
| `LOG_LEVEL` | no       | `info`    | `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent` |

Copy `apps/api/.env.example` to `apps/api/.env` for local runs; `start` loads it when present. Scripts (`pnpm --filter @goakit/api run <script>`): `build` (compiles to `dist/`), `start` (runs `dist/main.js`), `openapi` (writes `dist/openapi.json`; run after `build`), `typecheck`, `lint`, `test` (Vitest), `format`, `format:check`.

### Errors

Every error response, including validation failures, unknown routes (`404`), malformed JSON, and unexpected failures, uses [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457) with the `application/problem+json` content type:

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "The request has 1 invalid field.",
  "instance": "/v1/echo",
  "errors": [
    {
      "location": "body",
      "field": "message",
      "message": "Too small: expected string to have >=1 characters",
      "code": "too_small"
    }
  ]
}
```

- `type` is `about:blank` for every current error, so `title` is the HTTP status phrase; clients branch on `status`. Problem types with their own URI, if ever needed, are added to the catalogue in `apps/api/src/problem/problem-details.ts`.
- `instance` is the request path without the query string.
- `errors` appears on validation errors (`400`) and lists every invalid value: `location` (`body`, `query`, or `path`), `field` (dot-separated path, absent when the whole part is invalid), `message`, and the Zod issue `code`.
- `5xx` responses always carry a generic `detail`; the real error is logged on the server and never sent to the client.

Input is validated with Zod: declare a DTO with `class MyDto extends createZodDto(schema) {}` (from `nestjs-zod`) and type a `@Body()`, `@Query()`, or `@Param()` argument with it. The global `ZodValidationPipe` (`apps/api/src/validation/`) parses the value, applies schema defaults, and rejects invalid input. To validate a single value, pass a schema to the pipe: `@Param('id', new ZodValidationPipe(z.uuid()))`.

### OpenAPI

The OpenAPI 3.1 document is generated from the controllers and their Zod DTOs, so the schemas are the single source of truth. `pnpm turbo run openapi --filter @goakit/api` builds the API and writes `apps/api/dist/openapi.json` without starting a server. The file is not committed: CI's `Build` job generates it and uploads it as the `openapi` workflow artifact whenever the API is affected (always on `main`). It documents every route, including `/health`, and each operation's Problem Details responses. `packages/contracts` (planned) will generate the TypeScript client from it.

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
