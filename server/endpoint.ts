import { type OpenAPIHono, type RouteConfig, createRoute, z } from '@hono/zod-openapi';

/**
 * A single API operation.
 *
 * Endpoints are declared as data rather than as hand-written Hono routes so that the HTTP route,
 * the OpenAPI document and the `/api/v1/tools` catalogue are all generated from one source. Adding
 * an endpoint means adding one object; nothing else has to be kept in sync.
 */
export interface Endpoint<TInput = unknown, TOutput = unknown> {
  /** Stable identifier, also used as the OpenAPI `operationId`. */
  id: string
  method: 'get' | 'post'
  /** Path below `/api/v1`, without a leading slash. */
  path: string
  summary: string
  description?: string
  tag: string
  /** Request body for POST, query string for GET. */
  input: z.ZodType<TInput, z.ZodTypeDef, any>
  /** Response payload placed under `data`. Defaults to an untyped object. */
  output?: z.ZodType<TOutput, z.ZodTypeDef, any>
  handler: (input: TInput) => TOutput | Promise<TOutput>
}

export function defineEndpoint<TInput, TOutput>(endpoint: Endpoint<TInput, TOutput>): Endpoint<TInput, TOutput> {
  return endpoint;
}

/**
 * Boolean query parameter.
 *
 * `z.coerce.boolean()` must not be used here: it applies JavaScript truthiness, so the string
 * `"false"` becomes `true` and every flag silently inverts. This accepts the literal forms a caller
 * would actually send and rejects anything else.
 */
export function booleanQuery(defaultValue: boolean) {
  return z
    .enum(['true', 'false', '1', '0'])
    .default(defaultValue ? 'true' : 'false')
    .transform(value => value === 'true' || value === '1')
    .openapi({ type: 'boolean', default: defaultValue } as never);
}

const errorSchema = z.object({
  error: z.object({
    code: z.string().openapi({ example: 'bad_request' }),
    message: z.string(),
    details: z.unknown().optional(),
  }),
}).openapi('Error');

function buildResponses(output: z.ZodType<any, z.ZodTypeDef, any>): RouteConfig['responses'] {
  return {
    200: {
      description: 'Success',
      content: { 'application/json': { schema: z.object({ data: output }) } },
    },
    400: {
      description: 'The request body or query string was rejected',
      content: { 'application/json': { schema: errorSchema } },
    },
    401: {
      description: 'A valid X-API-Key header is required',
      content: { 'application/json': { schema: errorSchema } },
    },
    413: {
      description: 'The request body is larger than the configured limit',
      content: { 'application/json': { schema: errorSchema } },
    },
    422: {
      description: 'The input was well-formed but could not be processed',
      content: { 'application/json': { schema: errorSchema } },
    },
    429: {
      description: 'Rate limit exceeded',
      content: { 'application/json': { schema: errorSchema } },
    },
    500: {
      description: 'Unexpected server error',
      content: { 'application/json': { schema: errorSchema } },
    },
  };
}

export function registerEndpoints(app: OpenAPIHono, endpoints: Endpoint<any, any>[]) {
  for (const endpoint of endpoints) {
    const output = endpoint.output ?? z.unknown();

    const route = createRoute({
      method: endpoint.method,
      path: `/api/v1/${endpoint.path}`,
      operationId: endpoint.id,
      tags: [endpoint.tag],
      summary: endpoint.summary,
      description: endpoint.description,
      request: endpoint.method === 'post'
        ? { body: { required: true, content: { 'application/json': { schema: endpoint.input as never } } } }
        : { query: endpoint.input as never },
      responses: buildResponses(output),
    });

    app.openapi(route, async (context) => {
      const input = endpoint.method === 'post'
        ? context.req.valid('json' as never)
        : context.req.valid('query' as never);

      const data = await endpoint.handler(input as never);

      return context.json({ data }) as never;
    });
  }
}

export { z };
