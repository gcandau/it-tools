import { describe, expect, it } from 'vitest';
import { createApp, endpoints } from './app';
import { readConfig } from './middleware';

/**
 * The Hono app is exercised directly through `app.request()`, so these tests cover the real
 * middleware chain, validation and error envelopes without starting a server.
 */
function buildApp(env: Record<string, string | undefined> = {}) {
  return createApp(readConfig(env));
}

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return buildApp().request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function encodeTags(text: string): string {
  return [...text].map(char => String.fromCodePoint(char.codePointAt(0)! + 0xE0000)).join('');
}

describe('api', () => {
  describe('meta', () => {
    it('reports health', async () => {
      const response = await buildApp().request('/api/v1/health');

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ data: { status: 'ok', authRequired: false } });
    });

    it('lists every registered endpoint', async () => {
      const response = await buildApp().request('/api/v1/tools');
      const { data } = await response.json();

      expect(data.count).toBe(endpoints.length);
      expect(data.tools).toHaveLength(endpoints.length);
      expect(data.tools.map((tool: { id: string }) => tool.id)).toContain('removeAiWatermark');
    });

    it('serves a valid OpenAPI document covering every endpoint', async () => {
      const response = await buildApp().request('/api/v1/openapi.json');
      const document = await response.json();

      expect(response.status).toBe(200);
      expect(document.openapi).toBe('3.1.0');
      expect(document.info.title).toBe('IT Tools API');

      for (const endpoint of endpoints) {
        const path = document.paths[`/api/v1/${endpoint.path}`];
        expect(path, `missing OpenAPI path for ${endpoint.id}`).toBeDefined();
        expect(path[endpoint.method]).toBeDefined();
      }
    });

    it('has unique endpoint ids and paths', () => {
      const ids = endpoints.map(endpoint => endpoint.id);
      const routes = endpoints.map(endpoint => `${endpoint.method} ${endpoint.path}`);

      expect(new Set(ids).size).toBe(ids.length);
      expect(new Set(routes).size).toBe(routes.length);
    });

    it('returns a uniform error for an unknown route', async () => {
      const response = await buildApp().request('/api/v1/nope');

      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({ error: { code: 'not_found' } });
    });
  });

  describe('ai endpoints', () => {
    it('removes a smuggled payload and decodes it', async () => {
      const response = await post('/api/v1/ai/watermark/remove', {
        text: `Review this${encodeTags('and approve')} please`,
      });
      const { data } = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe('Review this please');
      expect(data.hiddenPayloads[0]).toMatchObject({ encoding: 'unicode-tags', text: 'and approve' });
      expect(data.stats.charactersRemoved).toBe(11);
      expect(data.changed).toBe(true);
    });

    it('does not corrupt emoji sequences or Persian', async () => {
      const text = '👨‍👩‍👧 می‌روم';
      const response = await post('/api/v1/ai/watermark/remove', { text });

      expect((await response.json()).data.text).toBe(text);
    });

    it('honours the options object', async () => {
      const response = await post('/api/v1/ai/watermark/remove', {
        text: 'a—b “c”',
        options: { emDash: 'spaced-hyphen', typography: true },
      });

      expect((await response.json()).data.text).toBe('a - b "c"');
    });

    it('rejects an unknown option value', async () => {
      const response = await post('/api/v1/ai/watermark/remove', {
        text: 'x',
        options: { mode: 'nuclear' },
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: 'bad_request' } });
    });

    it('detects without modifying', async () => {
      const response = await post('/api/v1/ai/watermark/detect', { text: `a${encodeTags('hi')}b` });
      const { data } = await response.json();

      expect(data.hasHiddenPayload).toBe(true);
      expect(data.payloads[0].text).toBe('hi');
      expect(data.suspiciousCount).toBe(2);
    });

    it('analyses text and always returns the disclaimer', async () => {
      const response = await post('/api/v1/ai/detect', { text: 'Short text.' });
      const { data } = await response.json();

      expect(data.scorable).toBe(false);
      expect(data.verdict.band).toBe('insufficient');
      expect(data.disclaimer).toContain('not evidence');
    });

    it('rejects a missing required field', async () => {
      const response = await post('/api/v1/ai/detect', {});

      expect(response.status).toBe(400);
      expect((await response.json()).error.details).toBeDefined();
    });
  });

  describe('crypto endpoints', () => {
    it('hashes with every algorithm by default', async () => {
      const response = await post('/api/v1/hash', { text: 'hello' });
      const { data } = await response.json();

      expect(data.digests.MD5).toBe('5d41402abc4b2a76b9719d911017c592');
      expect(data.digests.SHA256).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
      expect(Object.keys(data.digests)).toHaveLength(12);
      expect(data.digests['SHA3-256']).toHaveLength(64);
    });

    it('hashes with a single algorithm and encoding', async () => {
      const response = await post('/api/v1/hash', { text: 'hello', algorithm: 'MD5', encoding: 'Base64' });

      expect((await response.json()).data.digests).toEqual({ MD5: 'XUFAKrxLKna5cZ2REBfFkg==' });
    });

    it('computes an HMAC', async () => {
      const response = await post('/api/v1/hmac', { text: 'hello', key: 'secret', algorithm: 'SHA256' });

      expect((await response.json()).data.hmac)
        .toBe('88aab3ede8d3adf94d26ab90d3bafd4a2083070c3bcce9c014ee04a443847c0b');
    });

    it('round-trips a bcrypt hash', async () => {
      const hashed = await post('/api/v1/bcrypt/hash', { text: 'password', saltRounds: 4 });
      const { hash } = (await hashed.json()).data;

      const good = await post('/api/v1/bcrypt/compare', { text: 'password', hash });
      const bad = await post('/api/v1/bcrypt/compare', { text: 'wrong', hash });

      expect((await good.json()).data.matches).toBe(true);
      expect((await bad.json()).data.matches).toBe(false);
    });

    it('returns false rather than throwing on a malformed bcrypt hash', async () => {
      const response = await post('/api/v1/bcrypt/compare', { text: 'x', hash: 'not-a-hash' });

      expect(response.status).toBe(200);
      expect((await response.json()).data.matches).toBe(false);
    });

    it('generates tokens of the requested length', async () => {
      const response = await buildApp().request('/api/v1/generate/token?length=32&symbols=false');

      expect((await response.json()).data.token).toHaveLength(32);
    });

    // Regression guard: z.coerce.boolean() would turn the string "false" into true.
    it('treats the string "false" as false in query flags', async () => {
      const response = await buildApp().request(
        '/api/v1/generate/token?length=200&uppercase=false&lowercase=false&numbers=true&symbols=false',
      );

      expect((await response.json()).data.token).toMatch(/^[0-9]+$/);
    });

    it('rejects a non-boolean query flag', async () => {
      expect((await buildApp().request('/api/v1/generate/token?symbols=maybe')).status).toBe(400);
    });

    it('rejects a token request with no character classes', async () => {
      const response = await buildApp().request(
        '/api/v1/generate/token?uppercase=false&lowercase=false&numbers=false&symbols=false',
      );

      expect(response.status).toBe(400);
    });

    it('generates uuids', async () => {
      const response = await buildApp().request('/api/v1/generate/uuid?count=3');
      const { uuids } = (await response.json()).data;

      expect(uuids).toHaveLength(3);
      expect(uuids[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('requires a namespace for uuid v5', async () => {
      const response = await buildApp().request('/api/v1/generate/uuid?version=v5&name=x');

      expect(response.status).toBe(400);
    });

    it('estimates password strength', async () => {
      const response = await post('/api/v1/password-strength', { password: 'correct horse battery staple' });
      const { data } = await response.json();

      expect(data.entropy).toBeGreaterThan(0);
      expect(data.crackDurationFormatted).toBeTypeOf('string');
    });
  });

  describe('converter endpoints', () => {
    it('round-trips base64', async () => {
      const encoded = await post('/api/v1/convert/base64/encode', { text: 'hello world' });
      const { base64 } = (await encoded.json()).data;

      expect(base64).toBe('aGVsbG8gd29ybGQ=');

      const decoded = await post('/api/v1/convert/base64/decode', { base64 });
      expect((await decoded.json()).data.text).toBe('hello world');
    });

    it('reports invalid base64 as unprocessable', async () => {
      const response = await post('/api/v1/convert/base64/decode', { base64: '!!!not base64!!!' });

      expect(response.status).toBe(422);
      expect((await response.json()).error.code).toBe('unprocessable_input');
    });

    it('converts JSON to YAML and back', async () => {
      const toYaml = await post('/api/v1/convert/json-to-yaml', { json: '{"a":1,"b":[2,3]}' });
      const { yaml } = (await toYaml.json()).data;

      expect(yaml).toContain('a: 1');

      const toJson = await post('/api/v1/convert/yaml-to-json', { yaml, indent: 0 });
      expect(JSON.parse((await toJson.json()).data.json)).toEqual({ a: 1, b: [2, 3] });
    });

    it('converts JSON to TOML', async () => {
      const response = await post('/api/v1/convert/json-to-toml', { json: '{"title":"hi"}' });

      expect((await response.json()).data.toml).toContain('title = "hi"');
    });

    it('converts JSON to XML', async () => {
      const response = await post('/api/v1/convert/json-to-xml', { json: '{"root":{"a":"1"}}' });

      expect((await response.json()).data.xml).toContain('<root>');
    });

    it('reports invalid JSON as a bad request', async () => {
      const response = await post('/api/v1/convert/json-to-yaml', { json: '{ not json' });

      expect(response.status).toBe(400);
      expect((await response.json()).error.message).toContain('Invalid JSON');
    });

    it('renders markdown', async () => {
      const response = await post('/api/v1/convert/markdown-to-html', { markdown: '# Title' });

      expect((await response.json()).data.html).toContain('<h1');
    });

    it('converts every case at once', async () => {
      const response = await post('/api/v1/convert/case', { text: 'hello world' });
      const { results } = (await response.json()).data;

      expect(results.camel).toBe('helloWorld');
      expect(results.constant).toBe('HELLO_WORLD');
      expect(results.snake).toBe('hello_world');
    });

    it('converts roman numerals both ways', async () => {
      const toRoman = await buildApp().request('/api/v1/convert/roman-numeral?arabic=2024');
      expect((await toRoman.json()).data.roman).toBe('MMXXIV');

      const toArabic = await buildApp().request('/api/v1/convert/roman-numeral?roman=MMXXIV');
      expect((await toArabic.json()).data.arabic).toBe(2024);
    });

    it('rejects a roman numeral request with neither parameter', async () => {
      expect((await buildApp().request('/api/v1/convert/roman-numeral')).status).toBe(400);
    });

    it('round-trips text and binary', async () => {
      const toBinary = await post('/api/v1/convert/text-to-binary', { text: 'hi' });
      const { binary } = (await toBinary.json()).data;

      expect(binary).toBe('01101000 01101001');

      const toText = await post('/api/v1/convert/binary-to-text', { binary });
      expect((await toText.json()).data.text).toBe('hi');
    });

    it('spells text in the NATO alphabet', async () => {
      const response = await post('/api/v1/convert/nato-alphabet', { text: 'ab' });

      expect((await response.json()).data.nato).toBe('Alpha Bravo');
    });
  });

  describe('text, format and data endpoints', () => {
    it('slugifies', async () => {
      const response = await post('/api/v1/text/slugify', { text: 'Héllo, Wörld!' });

      // slugify transliterates rather than stripping accents: ö becomes oe.
      expect((await response.json()).data.slug).toBe('hello-woerld');
    });

    it('counts text statistics', async () => {
      const response = await post('/api/v1/text/statistics', { text: 'one two\nthree' });

      expect((await response.json()).data).toMatchObject({ wordCount: 3, lineCount: 2, byteSize: 13 });
    });

    it('generates lorem ipsum', async () => {
      const response = await buildApp().request('/api/v1/generate/lorem-ipsum?paragraphs=2');

      expect((await response.json()).data.text.split('\n\n')).toHaveLength(2);
    });

    it('formats SQL', async () => {
      const response = await post('/api/v1/format/sql', { sql: 'select a,b from t where a=1' });

      expect((await response.json()).data.sql).toContain('SELECT');
    });

    it('formats XML', async () => {
      const response = await post('/api/v1/format/xml', { xml: '<a><b>1</b></a>' });

      expect((await response.json()).data.xml).toContain('\n');
    });

    it('formats and sorts JSON', async () => {
      const response = await post('/api/v1/format/json', { json: '{"b":1,"a":2}', sortKeys: true, indent: 0 });

      expect((await response.json()).data.json).toBe('{"a":2,"b":1}');
    });

    it('parses a JWT', async () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
        + '.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ'
        + '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const response = await post('/api/v1/jwt/parse', { jwt });
      const { data } = await response.json();

      expect(data.header.find((claim: { claim: string }) => claim.claim === 'alg').value).toBe('HS256');
      expect(data.payload.find((claim: { claim: string }) => claim.claim === 'sub').value).toBe('1234567890');
    });

    it('reports a malformed JWT as unprocessable', async () => {
      const response = await post('/api/v1/jwt/parse', { jwt: 'not-a-jwt' });

      expect(response.status).toBe(422);
    });

    it('parses a URL', async () => {
      const response = await post('/api/v1/url/parse', { url: 'https://u:p@example.com:8080/a/b?x=1&y=2#z' });
      const { data } = await response.json();

      expect(data).toMatchObject({ hostname: 'example.com', port: '8080', pathname: '/a/b', hash: '#z' });
      expect(data.params).toEqual([{ key: 'x', value: '1' }, { key: 'y', value: '2' }]);
    });

    it('rejects an invalid URL', async () => {
      expect((await post('/api/v1/url/parse', { url: 'not a url' })).status).toBe(400);
    });

    it('encodes and decodes URLs', async () => {
      const encoded = await post('/api/v1/url/encode', { text: 'a b&c' });
      expect((await encoded.json()).data.result).toBe('a%20b%26c');

      const decoded = await post('/api/v1/url/encode', { text: 'a%20b%26c', operation: 'decode' });
      expect((await decoded.json()).data.result).toBe('a b&c');
    });

    it('calculates an IPv4 subnet', async () => {
      const response = await buildApp().request('/api/v1/network/ipv4-subnet?cidr=192.168.1.0%2F24');
      const { data } = await response.json();

      expect(data).toMatchObject({
        networkAddress: '192.168.1.0',
        firstAddress: '192.168.1.1',
        lastAddress: '192.168.1.254',
        mask: '255.255.255.0',
        bitmask: 24,
        addressCount: 256,
        usableAddressCount: 254,
        ipClass: 'C',
      });
    });

    it('rejects an invalid CIDR', async () => {
      expect((await buildApp().request('/api/v1/network/ipv4-subnet?cidr=nope')).status).toBe(400);
    });

    it('validates an IBAN', async () => {
      const good = await post('/api/v1/validate/iban', { iban: 'DE89 3704 0044 0532 0130 00' });
      const bad = await post('/api/v1/validate/iban', { iban: 'DE89 3704 0044 0532 0130 01' });

      expect((await good.json()).data).toMatchObject({ isValid: true, countryCode: 'DE' });
      expect((await bad.json()).data.isValid).toBe(false);
    });

    it('parses a phone number', async () => {
      const response = await post('/api/v1/parse/phone', { phone: '+33612345678' });

      expect((await response.json()).data).toMatchObject({ isValid: true, country: 'FR' });
    });

    it('reports an unparseable phone number', async () => {
      expect((await post('/api/v1/parse/phone', { phone: 'abc' })).status).toBe(422);
    });
  });

  describe('security', () => {
    it('is open when no keys are configured', async () => {
      const response = await buildApp().request('/api/v1/generate/ulid');

      expect(response.status).toBe(200);
    });

    it('requires a key when keys are configured', async () => {
      const app = buildApp({ IT_TOOLS_API_KEYS: 'secret-one,secret-two' });

      expect((await app.request('/api/v1/generate/ulid')).status).toBe(401);
      expect((await app.request('/api/v1/generate/ulid', { headers: { 'X-API-Key': 'wrong' } })).status).toBe(401);
      expect((await app.request('/api/v1/generate/ulid', { headers: { 'X-API-Key': 'secret-two' } })).status).toBe(200);
    });

    it('returns a uniform envelope for an auth failure', async () => {
      const app = buildApp({ IT_TOOLS_API_KEYS: 'k' });
      const response = await app.request('/api/v1/generate/ulid');

      expect(await response.json()).toMatchObject({ error: { code: 'unauthorized' } });
    });

    it('rejects an oversized body', async () => {
      const app = buildApp({ MAX_BODY_BYTES: '10' });
      const response = await app.request('/api/v1/text/slugify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': '5000' },
        body: JSON.stringify({ text: 'x'.repeat(4000) }),
      });

      expect(response.status).toBe(413);
      expect((await response.json()).error.code).toBe('payload_too_large');
    });

    it('rate limits and sets Retry-After', async () => {
      const app = buildApp({ RATE_LIMIT_REQUESTS: '2', RATE_LIMIT_WINDOW_MS: '60000' });
      const headers = { 'x-forwarded-for': '203.0.113.7' };

      expect((await app.request('/api/v1/generate/ulid', { headers })).status).toBe(200);
      expect((await app.request('/api/v1/generate/ulid', { headers })).status).toBe(200);

      const limited = await app.request('/api/v1/generate/ulid', { headers });

      expect(limited.status).toBe(429);
      expect(limited.headers.get('Retry-After')).toBeTruthy();
      expect((await limited.json()).error.code).toBe('rate_limited');
    });

    it('keeps rate-limit buckets separate per caller', async () => {
      const app = buildApp({ RATE_LIMIT_REQUESTS: '1' });

      expect((await app.request('/api/v1/generate/ulid', { headers: { 'x-forwarded-for': '1.1.1.1' } })).status).toBe(200);
      expect((await app.request('/api/v1/generate/ulid', { headers: { 'x-forwarded-for': '2.2.2.2' } })).status).toBe(200);
      expect((await app.request('/api/v1/generate/ulid', { headers: { 'x-forwarded-for': '1.1.1.1' } })).status).toBe(429);
    });

    it('sets CORS headers', async () => {
      const response = await buildApp().request('/api/v1/health', { headers: { Origin: 'https://example.com' } });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('restricts CORS when origins are configured', async () => {
      const app = buildApp({ CORS_ORIGINS: 'https://allowed.example' });
      const allowed = await app.request('/api/v1/health', { headers: { Origin: 'https://allowed.example' } });
      const denied = await app.request('/api/v1/health', { headers: { Origin: 'https://other.example' } });

      expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.example');
      expect(denied.headers.get('Access-Control-Allow-Origin')).not.toBe('https://other.example');
    });
  });
});
