# Concept

Open-source alternative to the Stitch Fiddle chart creator: a designer for cross stitch, knitting and
crochet charts. Free, without premium limits and without branding on exports.

## Goal

Stitch Fiddle is a solid chart editor, but it locks core features behind a subscription: chart size,
high-resolution export, mirroring, custom stitches and exports without branding. This project offers
the same core features for free.

| Feature                             | Stitch Fiddle free | Stitch Fiddle premium | This project     |
| ----------------------------------- | ------------------ | --------------------- | ---------------- |
| Grid editor (crochet, knit, stitch) | yes                | yes                   | yes              |
| Image import to chart               | yes                | yes                   | yes              |
| Chart size                          | limited            | unlimited             | unlimited        |
| High-resolution export              | no                 | yes                   | yes              |
| Export without branding             | no                 | yes                   | yes, no branding |
| PDF, PNG, Excel, SVG export         | partly             | yes                   | yes              |
| Mirroring and rotation              | no                 | yes                   | yes              |
| Custom stitches                     | no                 | yes                   | yes              |
| Error checking                      | no                 | yes                   | yes              |
| Progress tracker                    | yes                | yes                   | yes              |
| Gauge calculator                    | yes                | yes                   | yes              |
| Sharing by link                     | yes                | yes                   | yes              |

## Decisions

- **Plain Angular in the frontend.** Built with the Angular CLI; `ng build` produces static files.
- **Spring Boot on Java 25 in the backend.** A REST API under `/api`, packaged as a jar.
- **PostgreSQL for all stored data.** Liquibase owns the schema, Hibernate only validates it.
- **Accounts are required to save.** Every pattern belongs to an account, which makes them available
  on every device. Share links are the only way to see a chart without one.
- **Server-side sessions.** Sessions live in Postgres behind an `HttpOnly` cookie, with CSRF
  protection. Signing out or changing a password takes effect at once, and no token secret has to
  be managed. Frontend and backend share one origin, so there is no CORS.
- **The backend stores, the browser computes.** Editing, exports, image quantisation, error checks
  and gauge maths run in the browser; the results that have to last are stored. An imported image
  never leaves the browser, only the resulting pattern is saved.
- **First craft type: cross stitch.** It only needs colours, so the grid and the tools come first;
  knitting and crochet add symbols on top.
- **Not planned yet:** e-mail verification and password reset. Both need a mail server.

What each feature keeps in the database:

| Feature                  | Runs in | Stored in Postgres                  |
| ------------------------ | ------- | ----------------------------------- |
| Accounts                 | backend | `users`, sessions                   |
| Grid editor, chart size  | browser | `patterns`                          |
| Mirroring and rotation   | browser | the changed pattern                 |
| Image import             | browser | the resulting pattern               |
| Exports                  | browser | nothing, the file goes to the user  |
| Custom stitches          | both    | `custom_stitches`, per account      |
| Error checking           | browser | nothing, it reads the pattern       |
| Progress tracker         | both    | `pattern_progress`, per pattern     |
| Gauge calculator         | browser | gauge settings on the pattern       |
| Sharing by link          | both    | `share_links`                       |

"Unlimited" chart size means no product limit. The API keeps a configurable technical limit on the
request size so that a single request cannot exhaust the server.

## Data model

```ts
type CraftType = 'crossStitch' | 'knitting' | 'crochet' | 'pixelArt';

interface Pattern {
  id: string;
  title: string;
  craftType: CraftType;
  width: number;
  height: number;
  palette: string[]; // hex colours, cell value n refers to palette[n - 1]
  cells: number[]; // flat, length width * height, 0 = empty
  symbols?: number[]; // optional, knitting and crochet: symbol id per cell
  version: number; // optimistic locking, a stale save answers 409
  createdAt: string;
  updatedAt: string;
}
```

`cells` is a flat array on purpose: it saves memory and turns mirroring and rotation into index
arithmetic instead of object traversal. In Postgres `cells` and `symbols` are `integer[]`, which the
database compresses by itself, and `palette` is `text[]`. A list entry carries a small PNG thumbnail
that the browser renders when it saves, so the library never has to load whole charts.

## API

| Method                | Route                         | Purpose                               |
| --------------------- | ----------------------------- | ------------------------------------- |
| `POST`                | `/api/auth/register`          | Create an account                     |
| `POST`                | `/api/auth/login`             | Sign in                               |
| `POST`                | `/api/auth/logout`            | Sign out                              |
| `GET`                 | `/api/auth/me`                | Current user                          |
| `PUT`                 | `/api/account`                | Change username or e-mail             |
| `PUT`                 | `/api/account/password`       | Change the password                   |
| `DELETE`              | `/api/account`                | Delete the account and its data       |
| `GET`, `POST`         | `/api/patterns`               | List own patterns, create one         |
| `GET`, `PUT`, `DELETE` | `/api/patterns/{id}`          | Load, save, delete                    |
| `GET`, `PUT`          | `/api/patterns/{id}/progress` | Progress tracker                      |
| `POST`, `DELETE`      | `/api/patterns/{id}/share`    | Create or revoke the share link       |
| `GET`                 | `/api/share/{slug}`           | Public read-only view of a chart      |
| `GET`, `POST`         | `/api/stitches`               | List own custom stitches, create one  |
| `PUT`, `DELETE`       | `/api/stitches/{id}`          | Change or delete a custom stitch      |
| `GET`                 | `/api/health`                 | Health check                          |

## Grid operations

All client-side on the flat array:

- Mirroring reverses the index order per row or column.
- A 90° clockwise rotation maps `(x, y)` to `(height - 1 - y, x)` and swaps width and height.

## Rendering

- One `<canvas>` per chart. A 100×100 chart as DOM would be 10,000 nodes.
- Redraw only the changed region (dirty rectangle) while drawing.
- Zoom and pan through the canvas transform.
- Symbols of knitting and crochet are drawn from a sprite per craft type.

## Image import

1. Load the image into a canvas and read it with `getImageData()`.
2. Downsample to the grid size by averaging each target cell. Nearest neighbour loses detail.
3. Reduce to N colours by median cut.
4. The result is a `cells` array and a generated `palette`.

## Hosting

Three containers under Podman Compose: a small web server that serves the static frontend and
proxies `/api` to the backend, the backend, and Postgres. Only the web server is exposed, behind the
existing reverse proxy on a `theocloud.dev` subdomain.
