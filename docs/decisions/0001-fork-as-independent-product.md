# 0001. Fork as an independent product (DEC-00)

- Status: Accepted
- Date: 2026-11-22
- Decided by: Thales Reiser
- Plan ID: DEC-00

## Context

Goakit started in Gabriel Guerguen's repository (`gabrielguerguen/goakit`) as a prototype with mock data and in-memory state for a packing checklist for music festivals with camping. The original documentation assigned product and design decisions to Gabriel and future infrastructure to Bruno, and explicitly excluded a backend, persistence, real authentication, public links, a complete web application, and integrations.

This repository (`thalesreiser/goakit`) is a fork. Its development plan goes beyond the prototype: a central API, a local-first mobile app released to the stores, and a web app, organized as a monorepo.

## Decision

The fork is Thales Reiser's own product, and Thales makes all decisions about it.

- Gabriel's brief, Paper screens, and comments remain the product reference. They inform decisions; they do not limit the fork's scope.
- The following enter scope: a central backend API (the core of the product), a mobile app released to the stores, a web app, and a pnpm/Turborepo monorepo that holds them.
- The upstream repository only receives pull requests if Gabriel wants them. Work is pushed and reviewed in `thalesreiser/goakit`.

## Alternatives considered

- **Keep the fork as a contribution branch of the upstream project**: every scope change would need Gabriel's approval, and the backend, web app, and store release would stay out of scope.
- **Start a new repository from scratch**: loses the history, the working first UI block, and the documented product invariants.

## Consequences

- Statements in older documents that Gabriel's instructions define the delivery, or that Bruno owns infrastructure, no longer apply in this fork. `AGENTS.md` reflects the new scope; the product invariants are unchanged.
- The fork inherits code, documentation, and the Refração design system created by Gabriel. The current `LICENSE` is the Expo template's MIT license (copyright 650 Industries), which does not settle the rights to that material. Licensing and permission are an open decision (DEC-09) and must be settled before any store release.
- The monorepo, API, and web app are planned (EST-01.2 and later tasks); they do not exist yet.
