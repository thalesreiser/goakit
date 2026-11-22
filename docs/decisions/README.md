# Architecture decision records

This folder holds the architecture decision records (ADRs) for Goakit. An ADR records one significant decision about the product, the architecture, or how the project is run: the context that required it, what was decided, which alternatives were considered, and the consequences the project accepts.

Decisions are made by Thales Reiser, the owner of this fork (see [ADR 0001](0001-fork-as-independent-product.md)).

## Naming and numbering

- Files are named `NNNN-kebab-title.md`, for example `0002-backend-typescript-nestjs.md`.
- Numbers have four digits, are sequential, and are never reused. Take the next free number when you add a record.
- [`0000-template.md`](0000-template.md) is the template; copy it to start a new record.
- When a record formalizes an item from the development plan, it keeps that ID (for example `DEC-01`).

## Statuses

| Status | Meaning |
| --- | --- |
| Proposed | Written for discussion and not yet approved. Do not build on it as if it were settled. |
| Accepted | Approved by Thales. Work must follow it until it is superseded. |
| Superseded | Replaced by a later record. Keep the file, set the status to `Superseded by NNNN`, and link the replacement. |

Accepted records are not rewritten to change their meaning. To change a decision, write a new record that supersedes the old one. Fixing typos or broken links is fine.

## Open questions

Open product questions (Q01–Q15) and the earlier decision log stay in [`docs/decisions.md`](../decisions.md). When an open question is resolved in a way that affects architecture or scope, record it here as an ADR and reference it from the question.

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [0001](0001-fork-as-independent-product.md) | Fork as an independent product (DEC-00) | Accepted |
| [0002](0002-backend-typescript-nestjs.md) | Backend in TypeScript with NestJS (DEC-01) | Accepted |
| [0003](0003-web-app-nextjs.md) | Web app with Next.js (DEC-04) | Accepted |
| [0004](0004-roles-single-owner.md) | Single owner for all tracks (DEC-12) | Accepted |
