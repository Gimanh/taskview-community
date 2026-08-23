# Security Policy

## Reporting a vulnerability

Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.

Report them privately using one of these channels:

- **GitHub private vulnerability reporting** (preferred): open the **Security** tab of this repository and click **Report a vulnerability**.
- **Email**: [support@taskview.tech](mailto:support@taskview.tech) with `[security]` in the subject.

Please include as much of the following as you can:

- A description of the issue and its impact
- Affected component (API, web app, MCP server, mobile app) and version
- Steps to reproduce, or a proof of concept
- Any suggested mitigation

## What to expect

- We will acknowledge your report within **5 business days**.
- We will keep you informed about progress and aim to release a fix for confirmed issues within **90 days** of the report, sooner for critical issues.
- Once a fix is released, we publish a GitHub Security Advisory for the affected versions and credit the reporter, unless they prefer to stay anonymous.
- We ask that you give us a reasonable time to fix the issue before disclosing it publicly.

## Supported versions

Security fixes are released for the latest minor version line only. Self-hosted installations should upgrade to the latest release to receive them.

## Scope

In scope:

- The TaskView API server, web app, MCP server, and mobile app in this repository
- The hosted service at `app.taskview.tech`

Out of scope:

- Vulnerabilities in third-party dependencies that are not exploitable in TaskView (report them upstream)
- Findings that require a compromised admin account or physical access to the server
- Missing security headers, rate limiting, or best-practice recommendations without a demonstrated impact
- Denial-of-service testing against the hosted service

## Safe harbor

We will not pursue legal action against researchers who act in good faith: test only against their own self-hosted instance or their own accounts on the hosted service, avoid accessing or modifying other users' data, and report findings privately as described above.
