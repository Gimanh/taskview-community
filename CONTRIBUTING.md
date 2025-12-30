## Repository structure (monorepo)

TaskView is a monorepo. Key packages/modules:

- `api/` — Node.js backend (HTTP API, auth, business logic)
- `web/` — Web client (UI) & Mobile client (Capacitor-based)
- `packages/` — Shared libraries, if present

### Where to put changes
- API endpoints / permissions / data rules → `api/`
- UI / interaction / screens → `web/`
- Cross-cutting types & utilities → `packages/`

If you are unsure where a change belongs, open an issue first or ask in the PR.


## Development workflow

### Before you start
- For non-trivial changes, please open an issue first (or comment on an existing one) to align on approach.
- One PR should ideally solve one problem (feature OR fix OR refactor).

### Branch naming
Use a short prefix:
- `feat/<short-description>`
- `fix/<short-description>`
- `chore/<short-description>`
- `refactor/<short-description>`
- `docs/<short-description>`

### Commits
Write clear commit messages. If you use Conventional Commits, prefer:
- `feat: ...`
- `fix: ...`
- `chore: ...`
- `refactor: ...`
- `docs: ...`

### Pull requests
- Keep PRs focused and reviewable.
- Include a clear description: **what**, **why**, **how tested**.
- UI changes should include screenshots or a short screen recording.
- If your change affects API contracts/types, update shared types (and client usage) accordingly.

### PR checklist
- [ ] Tests pass locally / CI passes
- [ ] Lint/format passes
- [ ] No secrets added (tokens, keys, `.env`, private URLs)
- [ ] Docs updated (if behavior changed)
- [ ] CLA signed (first-time contributors)

## Security

Please do not report security vulnerabilities via public GitHub issues.

### How to report
Send a private report with:
- affected component (api/web/mobile)
- steps to reproduce / proof of concept
- impact assessment (what an attacker can do)
- versions/commit hash (if applicable)

**Contact:**
- Use: `support@taskview.tech` and prefix the subject with `[SECURITY]`.

We will acknowledge receipt and work on a fix. After a fix is available, we can coordinate a responsible public disclosure.


## Legal: Contributor License Agreement (CLA)

To protect the long-term sustainability of TaskView, we require a Contributor License Agreement (CLA) for **all** contributions.

The CLA is a single document covering both individuals and companies:
- `CLA/CLA.md`

### Why we require a CLA (plain English)
You keep ownership of your contribution, but you grant TaskView the rights to use, modify, distribute, sublicense, and relicense
your contribution (including under commercial/proprietary terms). This allows TaskView to offer commercial licenses and evolve
licensing in the future without asking contributors for additional permission.

### How to sign
We use a GitHub-based CLA check on pull requests.

When you open your first pull request, a bot will ask you to sign the CLA.
Signing is tied to your GitHub account, and your GitHub username is recorded as part of the signature.

If you are contributing on behalf of a company, sign the same CLA and select the **Corporate (Company)** option in the signature
block. Be sure you are authorized to sign for your company.

### By submitting code you confirm
- You wrote the contribution yourself OR you have the right to submit it.
- Your employer allows you to contribute (if you contribute as part of your job).
- If you include third-party code, you clearly disclose its source and license in the PR.

## Third-party code & dependency licensing

We want to keep TaskView easy to adopt for individuals and companies. Please be careful with third-party code.

### General rules
- Do not copy-paste code from the internet unless the license permits it and you include attribution when required.
- Do not introduce dependencies with unclear or restrictive licensing.
- If your PR adds or updates dependencies, explain **why it is needed** and include a link to the dependency license.

### Allowed licenses (recommended)
Common permissive licenses are typically acceptable, for example:
- MIT, Apache-2.0, BSD-2-Clause / BSD-3-Clause, ISC

### Licenses that require prior discussion
Please open an issue before adding dependencies under licenses like:
- GPL, AGPL, LGPL (copyleft licenses may create adoption/legal friction for users)

### What to include in the PR when adding a dependency
- Dependency name + version
- Purpose (why it’s needed)
- License type
- Any notable risks (bundle size, security, maintenance)

### Questions
If you have questions about the CLA or commercial licensing, contact: support@taskview.tech
