<script setup lang="ts">
import {
  type CleaningOptions,
  cleanText,
  segmentForDisplay,
} from './ai-watermark-remover.service';
import { analyseInvisibleCharacters } from '@/utils/unicode-invisible';
import { useQueryParamOrStorage } from '@/composable/queryParams';
import { useCopy } from '@/composable/copy';

const input = ref('');

const invisible = useQueryParamOrStorage({ name: 'invisible', storageName: 'awr:invisible', defaultValue: true });
const homoglyphs = useQueryParamOrStorage({ name: 'homoglyphs', storageName: 'awr:homoglyphs', defaultValue: true });
const typography = useQueryParamOrStorage({ name: 'typography', storageName: 'awr:typography', defaultValue: true });
const styledLatin = useQueryParamOrStorage({ name: 'styled', storageName: 'awr:styled', defaultValue: false });
const whitespace = useQueryParamOrStorage({ name: 'whitespace', storageName: 'awr:whitespace', defaultValue: false });
const aggressive = useQueryParamOrStorage({ name: 'aggressive', storageName: 'awr:aggressive', defaultValue: false });
const emDash = useQueryParamOrStorage<CleaningOptions['emDash']>({
  name: 'emdash',
  storageName: 'awr:emdash',
  defaultValue: 'keep',
});

const report = computed(() => cleanText(input.value, {
  invisible: invisible.value,
  mode: aggressive.value ? 'aggressive' : 'safe',
  homoglyphs: homoglyphs.value,
  styledLatin: styledLatin.value,
  typography: typography.value,
  emDash: emDash.value,
  whitespace: whitespace.value,
}));

const output = computed(() => report.value.text);
const { copy } = useCopy({ source: output, text: 'Cleaned text copied to the clipboard' });

/** The removal report, grouped by character, most frequent first. */
const removalRows = computed(() => {
  const grouped = new Map<string, { character: string; name: string; type: string; count: number }>();

  for (const finding of report.value.invisibleRemoved) {
    const row = grouped.get(finding.label);
    if (row) {
      row.count++;
    }
    else {
      grouped.set(finding.label, {
        character: finding.label,
        name: finding.name,
        type: finding.class,
        count: 1,
      });
    }
  }

  for (const finding of report.value.homoglyphsReplaced) {
    const key = `${finding.label}→${finding.replacement}`;
    const row = grouped.get(key);
    if (row) {
      row.count++;
    }
    else {
      grouped.set(key, {
        character: `${finding.label} (${finding.char})`,
        name: `Homoglyph rewritten to "${finding.replacement}"`,
        type: 'homoglyph',
        count: 1,
      });
    }
  }

  for (const finding of report.value.styledLatinFolded) {
    const key = `styled:${finding.label}`;
    const row = grouped.get(key);
    if (row) {
      row.count++;
    }
    else {
      grouped.set(key, {
        character: `${finding.label} (${finding.char})`,
        name: `Styled Latin folded to "${finding.replacement}"`,
        type: 'styled-latin',
        count: 1,
      });
    }
  }

  for (const finding of report.value.typographyChanged) {
    const key = `typo:${finding.label}`;
    const row = grouped.get(key);
    if (row) {
      row.count++;
    }
    else {
      grouped.set(key, {
        character: `${finding.label} (${finding.char})`,
        name: `Typography folded to "${finding.replacement}"`,
        type: finding.category,
        count: 1,
      });
    }
  }

  return [...grouped.values()].sort((a, b) => b.count - a.count);
});

/** Everything detected, including what was deliberately kept — the honest view. */
const inspection = computed(() => segmentForDisplay(
  input.value,
  // Cap the preview: highlighting tens of thousands of nodes freezes the page.
  report.value.invisibleRemoved.slice(0, 500),
));

// Detection runs on the *original* text, so payloads and legitimate characters are still reported
// when the stripping passes are switched off.
const sourceAnalysis = computed(() => analyseInvisibleCharacters(input.value));

const payloads = computed(() => sourceAnalysis.value.payloads);

const keptFindings = computed(() =>
  sourceAnalysis.value.findings.filter(finding => finding.severity === 'none'),
);
</script>

<template>
  <div>
    <c-card title="Text to clean">
      <!-- Deliberately not autosized: a long pasted text would otherwise push the report and the
           decoded payload below the fold. -->
      <c-input-text
        v-model:value="input"
        rows="8"
        raw-text
        multiline
        monospace
        placeholder="Paste the text here..."
        test-id="input"
      />
    </c-card>

    <c-card title="Passes">
      <n-form label-placement="left" label-width="230">
        <n-form-item label="Remove invisible characters">
          <n-switch v-model:value="invisible" />
        </n-form-item>
        <n-form-item label="Fold homoglyphs to Latin">
          <n-switch v-model:value="homoglyphs" />
        </n-form-item>
        <n-form-item label="Normalise typography">
          <n-switch v-model:value="typography" />
        </n-form-item>
        <n-form-item label="Fold styled Latin (𝐀 → A)">
          <n-switch v-model:value="styledLatin" />
        </n-form-item>
        <n-form-item label="Normalise whitespace">
          <n-switch v-model:value="whitespace" />
        </n-form-item>
        <n-form-item label="Em dash —">
          <c-select
            v-model:value="emDash"
            :options="[
              { label: 'Keep (recommended)', value: 'keep' },
              { label: 'Convert to -', value: 'hyphen' },
              { label: 'Convert to --', value: 'double-hyphen' },
              { label: 'Convert to - (spaced)', value: 'spaced-hyphen' },
            ]"
          />
        </n-form-item>
        <n-form-item label="Aggressive mode">
          <n-switch v-model:value="aggressive" />
        </n-form-item>
      </n-form>

      <div v-if="aggressive" text-sm op-70>
        <span font-bold>Careful: </span>
        aggressive mode removes every invisible character, including the joiners that hold emoji
        sequences together and the non-joiners that Persian and Indic scripts require. It will
        corrupt such text.
      </div>
    </c-card>

    <c-card title="Cleaned text">
      <textarea-copyable :value="output" copy-placement="outside" />

      <div mt-3 flex flex-wrap justify-center gap-4 text-sm op-70>
        <span data-test-id="stat-removed">{{ report.stats.charactersRemoved }} removed</span>
        <span data-test-id="stat-rewritten">{{ report.stats.charactersRewritten }} rewritten</span>
        <span>{{ report.stats.inputLength }} → {{ report.stats.outputLength }} characters</span>
      </div>

      <div mt-3 flex justify-center>
        <c-button :disabled="!report.changed" @click="copy()">
          Copy cleaned text
        </c-button>
      </div>
    </c-card>

    <c-card v-if="payloads.length > 0" title="Hidden payload decoded">
      <c-alert type="warning" title="This text carries a hidden message">
        Characters that render as nothing were carrying readable data. This is the mechanism behind
        prompt-injection and tracking payloads, so treat the decoded content as untrusted.
      </c-alert>

      <div v-for="payload of payloads" :key="payload.index" mt-4>
        <div text-sm op-70>
          {{ payload.encoding === 'unicode-tags' ? 'Unicode Tags block' : 'Variation selectors' }}
          at offset {{ payload.index }}
        </div>
        <textarea-copyable :value="payload.text" copy-placement="top-right" />
      </div>
    </c-card>

    <c-card v-if="removalRows.length > 0" title="What was changed">
      <c-table :data="removalRows" :headers="{ character: 'Character', name: 'What it is', type: 'Class', count: 'Count' }" />
    </c-card>

    <c-card v-if="keptFindings.length > 0" title="Deliberately kept">
      <div mb-3 text-sm op-70>
        These characters are invisible but legitimate in their context, so they were left in place.
      </div>
      <c-table
        :data="keptFindings.map(finding => ({
          character: finding.label,
          name: finding.name,
          reason: finding.reason ?? '',
        }))"
        :headers="{ character: 'Character', name: 'What it is', reason: 'Why it was kept' }"
      />
    </c-card>

    <c-card v-if="inspection.some(segment => segment.type === 'invisible')" title="Where they were">
      <div class="inspection" text-sm font-mono>
        <template v-for="(segment, index) of inspection" :key="index">
          <span v-if="segment.type === 'text'">{{ segment.value }}</span>
          <c-tooltip v-else :tooltip="`${segment.finding?.label} ${segment.finding?.name}`">
            <span class="badge">{{ segment.finding?.label }}</span>
          </c-tooltip>
        </template>
      </div>
    </c-card>

    <ApiUsage
      endpoint="ai/watermark/remove"
      :body="{ text: 'Paste the text to clean here.', options: { invisible: true, homoglyphs: true, typography: true } }"
    />

    <c-card title="What this tool can and cannot remove">
      <div text-sm op-80>
        <p>
          <span font-bold>It removes, exactly and verifiably:</span>
          zero-width and other invisible characters, Unicode Tags-block payloads (“ASCII
          smuggling”), the variation-selector byte channel, bidirectional controls, homoglyph
          substitutions, and non-ASCII typography. Stripping these out of pasted text is a genuine
          security win, because that is where prompt-injection payloads and tracking markers hide.
        </p>
        <p>
          <span font-bold>It cannot remove statistical watermarks.</span>
          Google's SynthID-Text, the red-green list schemes, and the marking Anthropic began
          applying to Claude output on 2 August 2026 are all embedded in
          <em>which words the model chose</em>, not in any character you can delete. They survive
          copy-paste, Unicode stripping and reformatting. Only substantial rewriting dilutes them,
          and that needs a language model — out of scope for a tool that runs in your browser.
        </p>
        <p>
          <span font-bold>Em dashes, curly quotes and non-breaking spaces are not watermarks.</span>
          Microsoft Word, Google Docs and iOS all produce them by autocorrect. The narrow no-break
          space that circulated in 2025 as an “OpenAI watermark” was confirmed by OpenAI to be a
          training artifact. Folding them is a formatting convenience, nothing more.
        </p>
        <p>
          File-level provenance (C2PA manifests, EXIF, XMP) lives in file bytes, not in text, so it
          is untouched by this tool. Everything here runs locally; nothing is uploaded.
        </p>
      </div>
    </c-card>
  </div>
</template>

<style lang="less" scoped>
.inspection {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow-y: auto;

  .badge {
    display: inline-block;
    padding: 0 4px;
    margin: 0 1px;
    border-radius: 3px;
    background-color: rgba(255, 100, 100, 0.25);
    font-size: 0.75em;
    vertical-align: middle;
  }
}
</style>
