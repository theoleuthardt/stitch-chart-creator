# Deployment

The app runs as three containers: a web server with the frontend, the backend and PostgreSQL. Only
the web server is exposed; it serves the app and passes `/api` on to the backend.

The images are public:

- `ghcr.io/theoleuthardt/stitch-chart-creator-frontend`
- `ghcr.io/theoleuthardt/stitch-chart-creator-backend`

`latest` follows `main`. Every commit also has a `sha-<commit>` tag, and a tag `v1.2.3` publishes
`1.2.3` and `1.2`.

## First start

On the host, in an LXC with Podman or Docker, in an empty folder:

```bash
curl -O https://raw.githubusercontent.com/theoleuthardt/stitch-chart-creator/main/compose.yml
curl -o .env https://raw.githubusercontent.com/theoleuthardt/stitch-chart-creator/main/.env.example
```

Set a long random `POSTGRES_PASSWORD` in `.env`, for example from `openssl rand -hex 32`. Then:

```bash
podman compose up -d
```

The backend waits for nothing: it fails while the database starts and the restart policy brings it
back. Every start applies the Liquibase changelog, so the schema is always current. The health check
is `GET /api/health`.

| Setting             | Meaning                                                                  |
| ------------------- | ------------------------------------------------------------------------ |
| `POSTGRES_PASSWORD` | Password of the database. Required.                                      |
| `PORT`              | Port of the web server on the host. Default `8080`.                      |
| `TAG`               | Image tag. Default `latest`; a version tag makes updates deliberate.     |
| `COOKIE_SECURE`     | Keep `true` behind HTTPS. Only `false` for a test over plain HTTP.       |

## Behind a reverse proxy

Point the proxy at `PORT` and let it terminate HTTPS. It has to pass `X-Forwarded-Proto` and
`X-Forwarded-For`. The session cookie is `Secure`, so signing in needs HTTPS; over plain HTTP the
browser drops the cookie.

The rate limits count per client address. The backend reads it from `X-Forwarded-For` and trusts
private addresses as proxies, which fits a proxy on the same network.

## Updating

```bash
podman compose pull
podman compose up -d
```

## Backups

All data lives in PostgreSQL. A dump while the app is running:

```bash
podman compose exec -T db pg_dump -U stitchcharts stitchcharts | gzip > stitchcharts-$(date +%F).sql.gz
```

Run it from cron and keep the files off the host. To restore into an empty database:

```bash
gunzip -c stitchcharts-2026-11-03.sql.gz | podman compose exec -T db psql -U stitchcharts stitchcharts
```

## First publication

GitHub creates a package as private the first time it is pushed. If a pull without login fails, the
owner sets each of the two packages to public once under the package settings on GitHub.
