# 0002. Backend in TypeScript with NestJS (DEC-01)

- Status: Accepted
- Date: 2026-11-22
- Decided by: Thales Reiser
- Plan ID: DEC-01

## Context

The API is the core of the product: accounts, published lists, public projections, back office data, and pluggable suggestion providers. The mobile app is local-first and must apply the same domain rules offline (binary progress, independent copies, adaptations applied once and only when accepted, public projection by explicit allowlist). The existing app is written in TypeScript.

## Decision

The backend is written in TypeScript with NestJS, using the Fastify adapter, and exposes a REST API under `/v1`.

- Domain rules live once in `packages/domain` (pure TypeScript, no I/O) and are used by both the API and the mobile app.
- The API generates its OpenAPI document; `packages/contracts` holds it together with the generated TypeScript client.
- Suggestion ("intelligence") features are pluggable providers inside the API. Every suggestion reaches the user as an adaptation with a reason, which the user accepts or rejects.

## Alternatives considered

- **Python + FastAPI**: a good fit for data work, but the rules would be written twice, in TypeScript on the device for offline use and in Python on the server, and the two would drift apart.
- **Supabase as the backend**: fast to start, but logic would be scattered across row-level security policies and edge functions, with less control over contracts, privacy checks, and testing.

## Consequences

- One shared `packages/domain` package, tested once and reused by the app and the API.
- The public projection is enforced on the server as well as on the device; the UI filter is never the only privacy guarantee.
- A Python machine learning service may be added later behind the API as a suggestion provider, without changing the app's contract.
- The monorepo and its packages are planned (EST-01.2); they do not exist yet.
