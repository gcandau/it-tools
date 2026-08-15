<script setup lang="ts">
import { useHead } from '@vueuse/head';
import { useCopy } from '@/composable/copy';

useHead({ title: 'API - IT Tools' });

const origin = computed(() => (typeof window === 'undefined' ? 'https://your-instance' : window.location.origin));

const referenceUrl = computed(() => `${origin.value}/api/docs`);
const specUrl = computed(() => `${origin.value}/api/v1/openapi.json`);
const catalogueUrl = computed(() => `${origin.value}/api/v1/tools`);

const example = computed(() => [
  `curl -s -X POST "${origin.value}/api/v1/ai/watermark/remove" \\`,
  '  -H \'content-type: application/json\' \\',
  '  -d \'{"text":"Paste the text to clean here."}\'',
].join('\n'));

const { copy } = useCopy({ source: example, text: 'Command copied to the clipboard' });

const isAvailable = ref<boolean | null>(null);
const endpointCount = ref(0);

onMounted(async () => {
  try {
    const response = await fetch('/api/v1/health');
    const { data } = await response.json();

    isAvailable.value = response.ok;
    endpointCount.value = data?.endpoints ?? 0;
  }
  catch {
    isAvailable.value = false;
  }
});
</script>

<template>
  <div class="api-docs">
    <n-h1>API</n-h1>

    <c-card v-if="isAvailable === false" mb-4>
      <c-alert type="warning" title="The API is not responding on this instance">
        The tools all work in your browser regardless. The API needs a server-side runtime: it ships
        as a Vercel serverless function, so a purely static deployment (the plain nginx Docker image,
        GitHub Pages, a file:// build) will not serve it.
      </c-alert>
    </c-card>

    <c-card mb-4>
      <p>
        Every tool listed here also runs over HTTP, so other software can use it without a browser.
        Send a text, get the result back.
      </p>
      <p v-if="isAvailable">
        <b>{{ endpointCount }}</b> endpoints are available on this instance.
      </p>
    </c-card>

    <c-card title="Interactive reference" mb-4>
      <p>
        The full reference, generated from the same definitions that build the routes, is at
        <c-link :href="referenceUrl">
          /api/docs
        </c-link>.
        The raw OpenAPI 3.1 document is at
        <c-link :href="specUrl">
          /api/v1/openapi.json
        </c-link>, and a machine-readable catalogue of every endpoint is at
        <c-link :href="catalogueUrl">
          /api/v1/tools
        </c-link>.
      </p>
    </c-card>

    <c-card title="Example" mb-4>
      <textarea-copyable :value="example" language="bash" copy-placement="top-right" />
      <div mt-3 flex justify-center>
        <c-button @click="copy()">
          Copy command
        </c-button>
      </div>
    </c-card>

    <c-card title="Conventions" mb-4>
      <ul>
        <li>Base path <code>/api/v1</code>. <code>POST</code> takes a JSON body, <code>GET</code> takes query parameters.</li>
        <li>Success is <code>{ "data": … }</code>; failure is <code>{ "error": { "code", "message", "details" } }</code>.</li>
        <li><code>400</code> means the request was malformed, <code>422</code> that the input could not be processed.</li>
        <li>Request bodies are capped at 1 MB by default and are never logged.</li>
      </ul>
    </c-card>

    <c-card title="Authentication and limits">
      <p>
        The API is open when no keys are configured, so a local or self-hosted instance works out of
        the box. Set <code>IT_TOOLS_API_KEYS</code> to a comma-separated list to require an
        <code>X-API-Key</code> header on every request.
      </p>
      <p>
        <code>RATE_LIMIT_REQUESTS</code> and <code>RATE_LIMIT_WINDOW_MS</code> control throttling, and
        <code>CORS_ORIGINS</code> restricts browser access.
      </p>
      <p op-80>
        <b>One caveat worth knowing:</b> the rate limiter keeps its counters in memory. On serverless
        each instance has its own counters and they vanish when the instance is recycled, so it
        throttles bursts rather than enforcing a global quota. If you need a real quota, put a shared
        store behind it.
      </p>
    </c-card>
  </div>
</template>

<style lang="less" scoped>
.api-docs {
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 40px;

  p {
    margin: 0 0 12px;
  }

  ul {
    list-style: disc;
    padding-left: 22px;

    li {
      margin-bottom: 6px;
    }
  }

  code {
    font-family: monospace;
    background-color: rgba(128, 128, 128, 0.15);
    padding: 1px 5px;
    border-radius: 3px;
  }
}
</style>
