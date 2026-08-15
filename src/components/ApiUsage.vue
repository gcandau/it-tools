<script setup lang="ts">
import { useCopy } from '@/composable/copy';

const props = defineProps<{
  /** Path below `/api/v1`, without a leading slash. */
  endpoint: string
  method?: 'GET' | 'POST'
  /** Request body, shown pretty-printed inside the curl snippet. */
  body?: unknown
}>();

const { endpoint, method = 'POST', body } = props;

const origin = computed(() => (typeof window === 'undefined' ? 'https://your-instance' : window.location.origin));

const snippet = computed(() => {
  const url = `${origin.value}/api/v1/${endpoint}`;

  if (method === 'GET') {
    return `curl -s "${url}"`;
  }

  return [
    `curl -s -X POST "${url}" \\`,
    '  -H \'content-type: application/json\' \\',
    `  -d '${JSON.stringify(body ?? {})}'`,
  ].join('\n');
});

const { copy } = useCopy({ source: snippet, text: 'Command copied to the clipboard' });
</script>

<template>
  <c-card>
    <c-collapse title="Use this from another program">
      <div mb-3 text-sm op-80>
        Every tool on this page is also available over HTTP, so other software can call it without a
        browser. The full reference is at
        <c-link to="/api-docs">
          /api-docs
        </c-link>.
      </div>

      <textarea-copyable :value="snippet" language="bash" copy-placement="top-right" />

      <div mt-3 flex justify-center>
        <c-button @click="copy()">
          Copy command
        </c-button>
      </div>
    </c-collapse>
  </c-card>
</template>
