# IT Tools HTTP API

The tools in this fork also run over HTTP, so other software can use them without a browser. Send a
text, get the result back.

- **Interactive reference:** `/api/docs`
- **OpenAPI 3.1 document:** `/api/v1/openapi.json`
- **Machine-readable catalogue:** `/api/v1/tools`
- **Health:** `/api/v1/health`

The reference and the catalogue are generated from the same endpoint definitions that build the
routes, so they cannot drift from the implementation.

## Quick start

```sh
curl -s -X POST "https://your-instance/api/v1/ai/watermark/remove" \
  -H 'content-type: application/json' \
  -d '{"text":"Paste the text to clean here."}'
```

```json
{
  "data": {
    "text": "Paste the text to clean here.",
    "removed": [],
    "rewritten": [],
    "hiddenPayloads": [],
    "stats": { "inputLength": 29, "outputLength": 29, "charactersRemoved": 0, "charactersRewritten": 0 },
    "changed": false
  }
}
```

## Conventions

| | |
|---|---|
| Base path | `/api/v1` |
| Request | `POST` takes a JSON body; `GET` takes query parameters |
| Success | `{ "data": … }` |
| Failure | `{ "error": { "code", "message", "details" } }` |
| `400` | The request was malformed or failed schema validation |
| `401` | A valid `X-API-Key` is required |
| `413` | The body exceeds the configured limit |
| `422` | Well-formed request, but the input could not be processed |
| `429` | Rate limited; a `Retry-After` header is set |

Request bodies are never logged.

## Configuration

All settings are environment variables read at startup.

| Variable | Default | Meaning |
|---|---|---|
| `IT_TOOLS_API_KEYS` | _unset_ | Comma-separated keys. **Unset means the API is open** — a local or self-hosted instance works with no configuration. When set, every `/api/v1` request must carry a matching `X-API-Key` header (compared in constant time). |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins. |
| `RATE_LIMIT_REQUESTS` | `60` | Requests per window, per API key or client IP. `0` disables. |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Window length in milliseconds. |
| `MAX_BODY_BYTES` | `1048576` | Request body cap (1 MB). |

### A caveat about rate limiting

The limiter keeps its counters **in memory**. On serverless each warm instance has its own counters
and they vanish when the instance is recycled, so it throttles bursts against a single instance
rather than enforcing a global quota. That is a deliberate trade-off — a hard quota needs shared
storage. If you need one, put Redis or similar behind `createRateLimiter` in
`server/middleware.ts`.

## Deployment

### Vercel (primary target)

The whole API is a **single catch-all function** at `api/[...route].ts`, which keeps the function
count flat as endpoints are added. It runs on the Node runtime — `bcryptjs` needs it, so do not
switch it to the edge runtime.

`vercel.json` must not send `/api/*` to the SPA:

```json
{ "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }] }
```

The legacy `routes` key that upstream used disables the automatic `api/` function build entirely,
which is why it was replaced with `rewrites`.

### Locally

```sh
pnpm dev:api     # http://localhost:3000/api/docs
```

### Self-hosting

The stock `Dockerfile` builds a **static** image (nginx serving `dist/`), so it has no API — a
static host cannot run one. `server/index.ts` is the same Hono app behind `@hono/node-server`, and
with `SERVE_STATIC=true` it serves the built SPA as well, so it can back a self-hosted deployment.
Bundling it into an image needs a TypeScript build step that this repo does not yet have.

## Adding an endpoint

Endpoints are declared as data in `server/routes/*.ts`; the HTTP route, the OpenAPI entry and the
catalogue are all derived from the declaration.

```ts
defineEndpoint({
  id: 'reverseText',
  method: 'post',
  path: 'text/reverse',
  tag: 'Text',
  summary: 'Reverse a string',
  input: z.object({ text: z.string() }),
  output: z.object({ reversed: z.string() }),
  handler: ({ text }) => ({ reversed: [...text].reverse().join('') }),
})
```

Then add the array to `endpoints` in `server/app.ts`. Handlers should call the tool's
`*.service.ts` rather than reimplementing logic, so the web tool and the API cannot diverge; if a
tool's logic still lives inside its `.vue`, extract it to a service first.

**Do not use `z.coerce.boolean()` for query flags.** It applies JavaScript truthiness, so the string
`"false"` becomes `true` and the flag silently inverts. Use `booleanQuery(default)` from
`server/endpoint.ts`, which accepts `true`/`false`/`1`/`0` and rejects anything else.

## Notes on dependencies

- **zod 3, not zod 4.** `@hono/zod-openapi@1.x` requires zod 4, whose types need TypeScript ≥ 5.5;
  this project pins `typescript: ~5.2`. `@hono/zod-openapi@0.19` works with the existing toolchain
  and needs no TypeScript bump.
- **`smol-toml` on the server**, not the `iarna-toml-esm` the SPA tools use: that package declares
  itself CommonJS but ships ES modules, which fails to load under Node and in a serverless bundle.
- **`pnpm.overrides` pins `@unhead/vue>@vueuse/shared` to `^10.3.0`.** Installing the API packages
  let pnpm re-resolve that transitive dependency to v14, which dropped the `resolveUnref` export
  `@unhead/vue@0.5.1` imports, breaking `pnpm build`. The override scopes the pin to that one
  dependent and leaves `@vueuse/core` alone.

## Testing

The Hono app is exercised directly, with no server running:

```ts
const response = await createApp(readConfig({})).request('/api/v1/health');
```

See `server/app.test.ts` — 60 tests covering every endpoint, the error envelopes, API-key auth,
rate limiting, body limits, CORS, and a check that the OpenAPI document covers every registered
endpoint.
