# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability** (private vulnerability reporting / security advisories). Do not open a public issue, discussion, or pull request that describes the problem.

Include the affected version or commit, steps to reproduce, and the impact you expect. You will get an acknowledgement in the advisory thread, and the fix will be coordinated there before any public disclosure.

## Scope

Goakit is currently a prototype with mock data and in-memory state: there is no backend, account system, or persistence yet. Reports about the app code, its dependencies, the build configuration, and the repository's CI are all in scope.

## Secrets

- Never commit tokens, passwords, private keys, signing certificates, or store credentials. `.gitignore` excludes `.env` files and common key formats; keep it that way.
- Mock data must not contain real credentials or personal data.
- Variables prefixed with `EXPO_PUBLIC_` are embedded in the app bundle and are public by design. Never put a secret in one.
- If a secret is committed by mistake, treat it as leaked: revoke or rotate it first, then remove it from the repository.
