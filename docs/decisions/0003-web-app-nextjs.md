# 0003. Web app with Next.js (DEC-04)

- Status: Accepted
- Date: 2026-11-22
- Decided by: Thales Reiser
- Plan ID: DEC-04

## Context

The product needs a web app for the public page of a shared list, with Open Graph previews when the link is posted in messaging apps and social networks; for account management, including account deletion as required by the stores; and for a back office. Link previews require the page to be rendered on the server. The mobile app uses React Native and TypeScript.

## Decision

`apps/web` uses Next.js with the App Router.

## Alternatives considered

- **Expo Router for web**: reuses the mobile code base, but its server rendering is weak for public pages that must produce reliable link previews.
- **Nuxt**: capable server rendering, but it is Vue and shares nothing with the React app.

## Consequences

- The web app shares design tokens (`packages/tokens`), domain rules (`packages/domain`), and the generated API client (`packages/contracts`) with the rest of the monorepo, and can share React components where that makes sense.
- Public list pages are rendered on the server, so Open Graph metadata comes from the same public projection, without progress or private items.
- The web app is planned (after EST-01.2); it does not exist yet. The current Expo web output remains a development preview only.
