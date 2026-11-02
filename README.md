# Stitch Chart Creator

Free, open-source chart designer for cross stitch, knitting and crochet: no chart size limit, no
premium tier and no branding on exports.

Concept and feature scope: [`docs/CONCEPT.md`](docs/CONCEPT.md).

## Development

Needs Node 22, Java 25, Podman or Docker, and [go-task](https://taskfile.dev).

```bash
task install        # install the frontend dependencies
task db:up          # start the local Postgres
task backend:dev    # backend on http://localhost:8080
task frontend:dev   # app on http://localhost:4200
task check          # lint, format check, tests and build
```

`task` lists everything else.

## Stack

- `frontend/`: Angular 22, Vitest, ESLint, Prettier
- `backend/`: Spring Boot 4 on Java 25, Maven, Flyway, Testcontainers
- PostgreSQL 18

## Contributing

The workflow and conventions are in [`CLAUDE.md`](CLAUDE.md).

## License

[MIT](LICENSE)
