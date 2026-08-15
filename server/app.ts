import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { Scalar } from '@scalar/hono-api-reference';
import { type Endpoint, registerEndpoints, z } from './endpoint';
import { type ApiConfig, apiKeyAuth, bodyLimit, createRateLimiter, readConfig } from './middleware';
import { badRequest, toErrorBody } from './errors';
import { aiEndpoints } from './routes/ai';
import { cryptoEndpoints } from './routes/crypto';
import { convertEndpoints } from './routes/convert';
import { textEndpoints } from './routes/text';

export const endpoints: Endpoint<any, any>[] = [
  ...aiEndpoints,
  ...cryptoEndpoints,
  ...convertEndpoints,
  ...textEndpoints,
];

export function createApp(config: ApiConfig = readConfig()) {
  const app = new OpenAPIHono({
    // Turn schema violations into the same error envelope as everything else.
    defaultHook: (result, context) => {
      if (!result.success) {
        const { status, body } = toErrorBody(
          badRequest('Request validation failed.', result.error.issues),
        );
        return context.json(body, status);
      }
    },
  });

  app.use('/api/*', cors({
    origin: config.corsOrigins.includes('*') ? '*' : config.corsOrigins,
    allowHeaders: ['Content-Type', 'X-API-Key'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 86400,
  }));

  app.use('/api/v1/*', bodyLimit(config));
  app.use('/api/v1/*', createRateLimiter(config).middleware());
  app.use('/api/v1/*', apiKeyAuth(config));

  app.onError((error, context) => {
    const { status, body } = toErrorBody(error);
    return context.json(body, status);
  });

  app.notFound(context => context.json(
    { error: { code: 'not_found', message: `No such endpoint: ${context.req.method} ${context.req.path}` } },
    404,
  ));

  registerEndpoints(app, endpoints);

  // Catalogue, derived from the same registry that builds the routes, so it can never drift.
  app.openapi(
    {
      method: 'get',
      path: '/api/v1/tools',
      operationId: 'listTools',
      tags: ['Meta'],
      summary: 'List every available endpoint',
      responses: {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: z.object({
                data: z.object({
                  count: z.number(),
                  tools: z.array(z.object({
                    id: z.string(),
                    method: z.string(),
                    path: z.string(),
                    tag: z.string(),
                    summary: z.string(),
                    description: z.string().optional(),
                  })),
                }),
              }),
            },
          },
        },
      },
    },
    context => context.json({
      data: {
        count: endpoints.length,
        tools: endpoints.map(endpoint => ({
          id: endpoint.id,
          method: endpoint.method.toUpperCase(),
          path: `/api/v1/${endpoint.path}`,
          tag: endpoint.tag,
          summary: endpoint.summary,
          description: endpoint.description,
        })),
      },
    }) as never,
  );

  app.get('/api/v1/health', context => context.json({
    data: { status: 'ok', endpoints: endpoints.length, authRequired: config.apiKeys.length > 0 },
  }));

  app.doc31('/api/v1/openapi.json', {
    openapi: '3.1.0',
    info: {
      title: 'IT Tools API',
      version: '1',
      description:
        'HTTP access to the IT Tools utilities, so other software can use them without a browser.\n\n'
        + 'Responses are `{ "data": ... }` on success and `{ "error": { "code", "message", "details" } }` '
        + 'on failure. When `IT_TOOLS_API_KEYS` is configured on the server, every `/api/v1` request '
        + 'must carry a matching `X-API-Key` header.',
      license: { name: 'GNU GPLv3', url: 'https://www.gnu.org/licenses/gpl-3.0.html' },
    },
    tags: [
      { name: 'AI', description: 'Watermark removal and text analysis' },
      { name: 'Crypto', description: 'Hashing, HMAC, bcrypt and generators' },
      { name: 'Converter', description: 'Format and encoding conversion' },
      { name: 'Text', description: 'Text transformation and statistics' },
      { name: 'Development', description: 'Formatters' },
      { name: 'Web', description: 'URL and JWT utilities' },
      { name: 'Network', description: 'IP and subnet utilities' },
      { name: 'Data', description: 'Validation and parsing' },
      { name: 'Meta', description: 'Catalogue and health' },
    ],
  });

  app.get('/api/docs', Scalar({ url: '/api/v1/openapi.json', pageTitle: 'IT Tools API' }));

  return app;
}

export type App = ReturnType<typeof createApp>;
