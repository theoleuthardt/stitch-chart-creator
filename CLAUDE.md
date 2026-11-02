# CLAUDE.md

Guidance for Claude Code in this repository. It is the single source of truth for the workflow and
the conventions; CodeRabbit reviews against it too. Keep it current in the same PR that changes
something it describes.

## Project

Stitch Chart Creator is a free, open-source chart designer for cross stitch, knitting and crochet,
built as an alternative to the paid features of Stitch Fiddle. No artificial limits, no branding.

The repository is a monorepo: an Angular single-page app in `frontend/`, a Spring Boot REST API in
`backend/` and PostgreSQL for all stored data. Accounts own the patterns. Reasoning, data model, API
and feature scope: [`docs/CONCEPT.md`](docs/CONCEPT.md).

## Commands

Always use `task <name>` (`Taskfile.yml`), not `npm`/`ng`/`mvnw` directly, whenever a task exists.

```bash
task install        # frontend dependencies, Maven fetches its own
task db:up          # local Postgres through compose.yaml
task backend:dev    # Spring Boot on :8080 with the dev profile
task frontend:dev   # ng serve on :4200, /api goes to the backend
task test           # frontend (Vitest) and backend (JUnit, real Postgres via Testcontainers)
task lint           # ESLint and Spotless check
task format         # Prettier and google-java-format
task build          # production bundle and jar
task check          # lint + format check + tests + build; run before calling anything done
task audit          # known vulnerabilities in the frontend runtime dependencies
```

Needs Node 22 (`frontend/.nvmrc`), Java 25 and Podman or Docker. Backend tests need a container
socket (`DOCKER_HOST`).

## Architecture

**Frontend** is a plain Angular CLI project: `frontend/angular.json` and the `@angular/build`
builders. `ng test` runs Vitest in jsdom with its globals, so specs do not import from `vitest`.

- `src/app/domain/` pure TypeScript, no Angular imports and no DOM: the pattern model, grid
  operations, image quantisation, checks, calculators. Everything here is unit tested.
- `src/app/api/` the HTTP services for the backend.
- `src/app/export/` turns a pattern into a file (PNG, SVG, PDF, XLSX, JSON), in the browser.
- `src/app/features/<name>/` one folder per screen or tool; components hold UI state only.
- `src/styles.css` holds the design tokens (`--color-*`); components use the tokens, never literal
  colours. Chart colours are user data and the only exception.

**Backend** is Spring Boot 4 on Java 25 with Maven, package by feature under
`dev.theocloud.stitchchart` (`account`, `pattern`, `share`, ...).

- Controllers parse and validate input and delegate; business logic lives in services.
- Every route on user data checks ownership; a foreign resource answers 404, never 403.
- Schema changes only through Flyway (`backend/src/main/resources/db/migration`,
  `V<n>__<description>.sql`). Hibernate validates the schema and never changes it.
- Integration tests run against a real Postgres (`TestcontainersConfiguration`), no H2.
- Secrets come from the environment; the `dev` profile holds only the local compose credentials.

Conventions:

- Standalone components, signals, zoneless, `ChangeDetectionStrategy.OnPush`. Selector prefix `scc`.
- `cells` is a flat array of length `width * height`, value `0` means empty. Never nest it.
- The chart is one `<canvas>`, never one DOM node per cell.
- The frontend calls relative `/api` paths: the dev proxy and later the production web server keep
  it same-origin, so there is no CORS.
- User interface and all repository content are in English.

## Code comments

Only real documentation comments: a TSDoc or Javadoc `/** */` on a class, function, module-level
constant or at the top of a file. No narrative comments, no step-by-step comments, no `// note:` asides, in any
language and in config files too. Reasoning goes in the enclosing doc comment or in `docs/`. Do not
add `eslint-disable` or `@SuppressWarnings` to get past a lint.

## Engineering standards

- **Test first.** Write the failing test, watch it fail, then implement. A test that correctly
  expresses the behaviour is a contract: when it fails the code is wrong, so never weaken it to get
  a run green. Change a test only when the desired behaviour changed, and say so.
- **No premature abstraction.** Three similar lines beat a helper built for hypothetical callers.
- **No dead code.** Delete it; git keeps the history.
- **Validate at boundaries, trust internals.** Request bodies in the backend and imported files in
  the frontend get validated where they enter the system. Internal calls do not re-check.
- **Security-conscious by default.** Never log or return secrets or password hashes, parameterize
  every query, and treat every unauthenticated route as hostile.
- **Small, focused changes.** One issue, one branch, one PR.
- **New dependencies are a decision.** Prefer a few lines of own code; no package with a known high
  or critical vulnerability, none that is unmaintained.
- **UI changes are run, not assumed.** Start the app and try the feature in a browser before calling
  it done; a green type check is not a working feature.

## Workflow

Everything goes through an issue. This is the loop, repeat it per issue in board order:

1. Read the issue: `gh issue view <n>`.
2. Branch from an up-to-date `main`: `git checkout -b <n>-<short-slug>`, then
   `scripts/kanban-status.sh <n> progress`.
3. Test-driven implementation, small commits in Conventional Commits style:
   `feat: add mirror tool (#<n>)` (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`).
   Stage with `git add -A` and check `git status --short`.
4. `task check`, and for UI changes run the app in a browser.
5. Push: `git -c credential.helper='!gh auth git-credential' push -u origin <branch>`.
6. Review before the PR: `review main`. It runs CodeRabbit and falls back to an Ollama model when
   CodeRabbit is rate-limited; if both fail use the `/code-review` skill. Verify every finding
   against the code before changing anything, because fallback findings only see the diff. Fix what
   is real, then push.
7. Open the PR: `gh pr create --title "feat: ..." --body "Closes #<n> ..."`, then
   `scripts/kanban-status.sh <n> review`. Post the review triage (fixed, or rejected with the reason)
   as a PR comment.
8. Wait for CI: `gh pr checks <n> --watch`. Red means fix it, not retry it.
9. Merge when CI is green on the head commit and no review finding is open:
   `gh pr merge <n> --squash --delete-branch`.
10. Read `gh pr view <n> --json state` and only when it says `MERGED`:
    `scripts/kanban-status.sh <n> done`, then `git checkout main && git pull`.

Rules of the loop:

- Every change lands through a PR, never push to `main` directly, however small.
- Never close an issue by hand; the `Closes #<n>` of the PR does that.
- A branch behind `main` with a conflict gets no CI: merge `origin/main` into it first.
- Claude works as the GitHub user `theo-claude`. Never switch accounts; when the bot lacks a right,
  ask the owner.
- Something that needs the owner (a product decision, a missing right) gets a question, not a guess.
  Everything else is decided, written down in the PR and continued.

## Project board

Private GitHub Project #5 "Kanban Stitch Chart Creator" of `theoleuthardt`, with the columns Backlog,
Ready, In progress, In review and Done. Every new issue goes onto it right after it is created:
`scripts/kanban-status.sh <n> backlog` adds the card and sets the column.
`scripts/kanban-status.sh <n> <backlog|ready|progress|review|done>` moves it.
