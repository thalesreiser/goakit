# 0004. Single owner for all tracks (DEC-12)

- Status: Accepted
- Date: 2026-11-22
- Decided by: Thales Reiser
- Plan ID: DEC-12

## Context

The documentation inherited from the upstream project names Gabriel as the product and design lead and Bruno as the person responsible for future infrastructure (storage, authentication, publication, synchronization, hosting). Under [ADR 0001](0001-fork-as-independent-product.md), the fork is Thales's own product.

## Decision

Thales Reiser owns every track in this fork: product, design, mobile, API, web, data, infrastructure, and release. References to Bruno as the infrastructure owner no longer apply in the fork.

## Alternatives considered

- **Keep the upstream roles**: Bruno has no role in this fork, so infrastructure decisions would have no owner.

## Consequences

- Documents that mention a handoff to Bruno (`README.md`, `docs/architecture.md`, `docs/delivery.md`, `docs/implementation.md`) describe the upstream plan; in the fork, those integration points are decided by Thales.
- Gabriel remains the author of the brief and the original design material, which are used as product reference.
- Agents escalate decisions to Thales as described in `AGENTS.md`.
