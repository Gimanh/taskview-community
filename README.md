# TaskView™

<p align="center">
  <img src="./assets/taskview/kanban-dark.png" alt="TaskView logo" width="320">
</p>

<p align="center">
  <strong>Self-hosted project management for software teams.</strong>
</p>

<p align="center">
  TaskView combines task management, custom workflows, developer integrations,
  analytics, and AI-assisted automation in a platform you can run on your own infrastructure.
</p>

<details>
  <summary><strong>View more screenshots</strong></summary>

  <br>

  <img src="./assets/taskview/main-light.png" alt="Main dashboard (light theme)" width="100%">
  <img src="./assets/taskview/main-dark.png" alt="Main dashboard (dark theme)" width="100%">
  <img src="./assets/taskview/main-collapsed-light.png" alt="Main dashboard with collapsed sidebar (light theme)" width="100%">
  <img src="./assets/taskview/main-collapsed-dark.png" alt="Main dashboard with collapsed sidebar (dark theme)" width="100%">
  <img src="./assets/taskview/kanban-light.png" alt="Kanban board (light theme)" width="100%">
  <img src="./assets/taskview/kanban-dark.png" alt="Kanban board (dark theme)" width="100%">
  <img src="./assets/taskview/tasks-light.png" alt="Task list view (light theme)" width="100%">
  <img src="./assets/taskview/tasks-dark.png" alt="Task list view (dark theme)" width="100%">
  <img src="./assets/taskview/recent-tasks.png" alt="Recent tasks overview" width="100%">
  <img src="./assets/taskview/sprints.png" alt="Sprint planning" width="100%">
  <img src="./assets/taskview/time-tracking.png" alt="Time tracking" width="100%">
  <img src="./assets/taskview/analytics.png" alt="Analytics dashboard" width="100%">
  <img src="./assets/taskview/members.png" alt="Organization members management" width="100%">
  <img src="./assets/taskview/permissions-light.png" alt="Role permissions (light theme)" width="100%">
  <img src="./assets/taskview/permissions-dark.png" alt="Role permissions (dark theme)" width="100%">
  <img src="./assets/taskview/sso.png" alt="Single Sign-On (SSO) configuration" width="100%">
  <img src="./assets/taskview/api-tokens.png" alt="API tokens management" width="100%">
  <img src="./assets/taskview/webhooks.png" alt="Webhooks configuration" width="100%">
  <img src="./assets/taskview/integrations.png" alt="Integrations" width="100%">
  <img src="./assets/taskview/ui-customization.png" alt="UI customization" width="100%">
  <img src="./assets/taskview/settings.png" alt="Settings" width="100%">

</details>

<p align="center">
  <a href="https://app.taskview.tech"><strong>TaskView Cloud</strong></a>
  ·
  <a href="https://taskview.tech/docs/"><strong>Documentation</strong></a>
  ·
  <a href="https://apps.apple.com/lk/app/taskview-todo-list-tasks/id6499107867"><strong>iOS</strong></a>
  ·
  <a href="https://play.google.com/store/apps/details?id=com.handscreamgnl.taskview.app"><strong>Android</strong></a>
  ·
<a href="https://github.com/Gimanh/taskview-community/releases">
  <strong>Releases</strong>
</a>
</p>

<p align="center">
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/license-Source--Available-blue" alt="Source-Available License">
  </a>
  <img src="https://img.shields.io/badge/status-active-brightgreen" alt="Active development">
  <img src="https://img.shields.io/badge/self--hosted-Docker-2496ED" alt="Docker self-hosted">
</p>

---

## About TaskView

TaskView is a source-available project and task management platform for small and growing software teams.

It is designed for teams that need more structure than a simple task board, but do not want the administration overhead and complexity of large enterprise project management systems.

With TaskView, you can manage projects, build custom workflows, track dependencies and time, connect development tools, and automate project operations through the API, webhooks, and MCP.

Your projects. Your infrastructure. Your data.

## Who TaskView is for

TaskView is a good fit for:

* software development teams;
* startups and small product companies;
* agencies managing internal and client projects;
* organizations that require self-hosting and data ownership;
* teams looking for a lightweight alternative to complex enterprise platforms;
* developers using AI agents to manage and automate project work;
* individuals managing technical or personal projects.

## Why TaskView

* **Own your data** - run TaskView on your own infrastructure.
* **Flexible workflows** - configure projects, statuses, boards, roles, and permissions.
* **Built for development teams** - connect GitHub, GitLab, API clients, and webhooks.
* **AI-ready** - allow MCP-compatible assistants to work with tasks and projects.
* **Available everywhere** - use TaskView from the web, iOS, and Android.
* **No advertising or behavioral tracking** - your project data remains under your control.

## Features

### Project and task management

* Projects, lists, tasks, and nested subtasks
* Custom Kanban boards and task statuses
* Priorities, tags, deadlines, and assignees
* Task dependency graph
* Sprints and recurring tasks
* Task history and activity tracking
* Markdown content
* Search and filtering
* Reusable project workflows

### Team collaboration

* Multiple organizations and projects
* User invites and granular permissions
* Clear responsibility assignment
* Real-time updates
* Notifications
* Organization-level user management

### Identity and access management

* SAML 2.0
* OpenID Connect
* SCIM provisioning
* Scoped API tokens
* Project-level access restrictions
* Fine-grained token permissions

### Developer integrations

* GitHub integration
* GitLab integration
* Signed webhooks
* TypeScript API client
* Public HTTP API
* MCP server for AI assistants

### Time tracking and analytics

* Built-in time tracking
* Billable and non-billable time
* Project and team workload reports
* Productivity analytics
* Income and expense tracking
* Financial reports

### Applications

* Web application
* iOS application
* Android application
* Self-hosted server deployment

## AI and MCP integration

TaskView includes an MCP server that allows compatible AI tools to interact with your projects.

Depending on the permissions assigned to an API token, an AI assistant can:

* search and inspect projects;
* create and update tasks;
* manage task statuses;
* work with project lists;
* retrieve task context;
* automate repetitive project operations.

MCP access can be restricted by permission and by selected projects.

See the [TaskView MCP documentation](https://taskview.tech/docs/integrations/mcp) for configuration examples.

## Quick start

Clone the repository:

```sh
git clone https://github.com/Gimanh/taskview-community.git
cd taskview-community
```

The recommended way to run TaskView is with Docker Compose.

For deployment instructions, environment variables, HTTPS configuration, updates, and backups, see the official documentation:

[TaskView self-hosting documentation](https://taskview.tech/docs/)

> Production deployments should use persistent volumes, HTTPS, regular database backups, and securely generated secrets.

## Repository structure

TaskView is maintained as a monorepo. Product packages share a single version.

```text
taskview-community/
├── api/
│   └── TaskView backend and HTTP API
├── web/
│   └── Vue web application and Capacitor mobile application
├── taskview-packages/
│   ├── taskview-api/
│   │   └── TypeScript API client
│   └── taskview-db-schemas/
│   │   └── Shared Drizzle ORM schemas
│   └── taskview-mcp/
│       └── MCP server for AI integrations
└── build-dockers.sh
    └── Docker image build script
```

### Main packages

| Package                                 | Description                                     |
| --------------------------------------- | ----------------------------------------------- |
| `api`                                   | Node.js backend and API server                  |
| `web`                                   | Vue web client and Capacitor mobile application |
| `taskview-packages/taskview-api`        | TypeScript client for the TaskView API          |
| `taskview-packages/taskview-db-schemas` | Shared Drizzle ORM database schemas             |
| `taskview-packages/taskview-mcp`        | MCP server for AI integrations                  |

## Technology stack

TaskView is primarily built with:

* Vue
* Nuxt UI
* TypeScript
* Node.js
* Express
* PostgreSQL
* Drizzle ORM
* Capacitor
* Docker

## Local development

These instructions are intended for contributors and local development, not for production deployment.

### Prerequisites

You need the following tools:

* Docker
* PostgreSQL
* Bun
* pnpm

On macOS, PostgreSQL can be installed using [Postgres.app](https://postgresapp.com/).

### Install dependencies

From the repository root:

```sh
pnpm install
```

### Configure the API

Create an environment file in the `api` directory:

```sh
cp api/.env.example api/.env
```

Update `api/.env` with your local database credentials and application configuration.

### Start the web application

```sh
cd web
pnpm dev
```

### Start the API

In a separate terminal:

```sh
cd api
pnpm start
```

The API uses Bun in the local development environment.

## Building Docker images

Docker image versions are taken from the root `package.json`.

### Build the images

From the repository root:

```sh
./build-dockers.sh
```

### Verify the images

```sh
docker images
```

The following images should be available:

```text
gimanhead/taskview-ce-api-server
gimanhead/taskview-ce-webapp
gimanhead/taskview-ce-db-migration
```

### Test the images locally

```sh
cd api/dev-containers-test
docker compose up
```

Ensure that image versions match the version defined in the root `package.json`.

## Versioning

TaskView follows [Semantic Versioning](https://semver.org/):

* `MAJOR` - breaking API, database, or compatibility changes;
* `MINOR` - backward-compatible features;
* `PATCH` - backward-compatible bug fixes.

The version represents the entire TaskView product, not individual packages.

## Project status

TaskView is under active development.

New features, database migrations, API changes, and breaking changes may be introduced between releases. Review release notes and back up your database before updating a self-hosted installation.

## Roadmap

Planned areas of development include:

* [ ] Desktop application
* [ ] Plugin and extension system
* [ ] Additional third-party integrations
* [ ] Expanded automation capabilities
* [ ] Continued UI and UX improvements

The roadmap may change based on product priorities and community feedback.

## Contributing

Contributions are welcome.

Before contributing:

1. Read [`CONTRIBUTING.md`](./CONTRIBUTING.md).
2. Check existing issues and pull requests.
3. Open an issue before starting a large architectural change.
4. Follow the project's code style and architecture.
5. Sign the Contributor License Agreement when required.

Contributions are accepted under the project's CLA.

## Licensing

TaskView is distributed under the TaskView Source-Available License.

You may:

* self-host TaskView;
* modify the source code;
* use TaskView internally within your organization;
* create integrations and internal extensions.

You may not:

* offer TaskView as a hosted SaaS;
* sell access to TaskView as a service;
* create a competing commercial product based on TaskView;
* use the TaskView name, logo, or branding for derivative products.

See [`LICENSE`](./LICENSE) for the complete terms.

TaskView is **source-available**, not OSI-approved open-source software.

For commercial licensing questions, hosted service permissions, or other use cases not covered by the license, contact the project maintainer.

## Security

Do not publish security vulnerabilities in public GitHub issues.

Report security issues privately using the contact information provided in the repository or on the TaskView website.

When running TaskView in production:

* use HTTPS;
* generate unique application secrets;
* restrict database access;
* keep Docker images and dependencies updated;
* configure persistent storage;
* create regular backups;
* restrict API-token permissions to the minimum required scope.

## Links

* [TaskView website](https://taskview.tech/)
* [TaskView Cloud](https://app.taskview.tech/)
* [Documentation](https://taskview.tech/docs/)
* [iOS application](https://apps.apple.com/lk/app/taskview-todo-list-tasks/id6499107867)
* [Android application](https://play.google.com/store/apps/details?id=com.handscreamgnl.taskview.app)
* [GitHub repository](https://github.com/Gimanh/taskview-community)

---

TaskView is developed and maintained by **Nikolai Giman**.

TaskView™ and the TaskView logo are trademarks of their respective owner.

Copyright © 2026 Nikolai Giman.
