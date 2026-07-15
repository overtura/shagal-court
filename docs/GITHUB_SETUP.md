# GitHub Setup

Repository: `overtura/shagal-court`

## labels

- `self-improvement`
- `size:small`
- `size:major`
- `cadence:override`
- `risk:r1`
- `risk:r2`
- `risk:r3`
- `auto-merge`
- `needs-human-review`

## repository settings

- squash merge enabled
- merge commit and rebase disabled unless organization policy requires them
- automatically delete head branches enabled
- auto-merge enabled when the organization plan permits it
- `main` direct push blocked
- required checks: `verify`, `e2e`
- dismiss stale approvals and require unresolved conversations to be resolved
- administrators should follow the same branch protection where allowed

## CLI audit and setup

```bash
gh repo view overtura/shagal-court
gh api repos/overtura/shagal-court
gh api repos/overtura/shagal-court/branches/main/protection
gh label list --repo overtura/shagal-court
```

Repository settings may be applied through the GitHub API only with admin permission. If branch protection cannot be created because of plan or permission limits, keep the CI workflow and PR-only discipline, record the exact API error here, and do not claim protection is active.

Publisher credentials should have only the repository content/PR/status permissions needed by the central bot. Analyzer credentials must not publish. Production Cloudflare secrets are never GitHub PR inputs.

## CI

`.github/workflows/ci.yml` uses Node 24 and pnpm lockfile. `verify` covers lint, two strict type domains, client/shared tests, workerd/D1 tests, production build and cost guard. `e2e` runs Chromium at 1440, 768 and 360 widths with local D1.

## Current setup record

2026-07-15 API read-back verified:

- all nine self-improvement/risk labels exist;
- squash merge and auto-merge are enabled;
- merge commit and rebase merge are disabled;
- merged head branches are deleted automatically;
- `main` protection is strict and requires `verify` and `e2e`;
- administrators are included, linear history and conversation resolution are required;
- force push and branch deletion are disabled.
