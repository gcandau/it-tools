<script setup lang="ts">
import {
  MINIMUM_WORD_COUNT,
  type Signal,
  type SignalReliability,
  detectAiText,
} from './ai-text-detector.service';

const input = ref('');

const result = computed(() => detectAiText(input.value));

const reliabilityLabels: Record<SignalReliability, string> = {
  'high': 'High confidence',
  'medium': 'Medium confidence',
  'low': 'Low confidence',
  'very-low': 'Near noise',
};

const bandStyles: Record<string, { colour: string }> = {
  insufficient: { colour: '#8b8b8b' },
  none: { colour: '#18a058' },
  weak: { colour: '#a5a217' },
  moderate: { colour: '#d9822b' },
  strong: { colour: '#d03050' },
};

const verdictColour = computed(() => bandStyles[result.value.verdict.band]?.colour ?? '#8b8b8b');

function scorePercent(signal: Signal): number {
  return Math.round(signal.score * 100);
}

const metricRows = computed(() => {
  const { metrics, wordCount, sentenceCount } = result.value;

  return [
    { metric: 'Words', value: String(wordCount) },
    { metric: 'Sentences', value: String(sentenceCount) },
    { metric: 'Mean sentence length', value: `${metrics.burstiness.meanSentenceLength.toFixed(1)} words` },
    { metric: 'Burstiness (σ/μ)', value: metrics.burstiness.coefficientOfVariation.toFixed(2) },
    { metric: 'Burstiness (bounded)', value: metrics.burstiness.bounded.toFixed(2) },
    { metric: 'MTLD', value: metrics.mtld.toFixed(1) },
    { metric: 'MATTR-50', value: metrics.mattr.toFixed(3) },
    { metric: 'Hapax ratio', value: `${(metrics.hapaxRatio * 100).toFixed(1)}%` },
    { metric: 'Distinct trigrams', value: `${(metrics.distinctTrigramRatio * 100).toFixed(1)}%` },
    { metric: 'Distinct 4-grams', value: `${(metrics.distinctQuadgramRatio * 100).toFixed(1)}%` },
    { metric: 'Function-word share', value: `${(metrics.functionWordShare * 100).toFixed(1)}%` },
    { metric: 'Em dashes / 1000 words', value: metrics.punctuation.emDashPer1000.toFixed(1) },
    { metric: 'Contractions / 1000 words', value: metrics.punctuation.contractionsPer1000.toFixed(1) },
  ];
});
</script>

<template>
  <div>
    <c-card title="Text to analyse">
      <!-- Deliberately not autosized: this tool is fed long texts, and a growing textarea would
           push the verdict and the signal breakdown far below the fold. -->
      <c-input-text
        v-model:value="input"
        rows="12"
        raw-text
        multiline
        placeholder="Paste at least 300 words..."
        test-id="input"
      />
      <div mt-2 text-sm op-70 data-test-id="word-count">
        {{ result.wordCount }} words
        <span v-if="!result.scorable">— {{ MINIMUM_WORD_COUNT }} needed for style analysis</span>
      </div>
    </c-card>

    <c-card title="Read this first">
      <div text-sm op-80>
        <p>
          <span font-bold>This is a style analyser, not evidence.</span>
          It computes surface statistics — sentence-length variation, vocabulary richness,
          punctuation and known AI phrasing. It does not run a language model, and it cannot detect
          statistical watermarks such as Google's SynthID-Text or the marking Anthropic began
          applying to Claude output on 2 August 2026, because those live in token choice and leave
          no characters behind.
        </p>
        <p>
          <span font-bold>Published false-positive rates for detectors of this kind are
            unacceptable for any consequential decision.</span>
          A Stanford study (Liang et al., <em>Patterns</em>, 2023) found seven commercial detectors
          misclassified <b>61.22%</b> of TOEFL essays by non-native English writers as
          AI-generated, against <b>5.19%</b> for native writers — and <b>19.78%</b> were flagged by
          all seven. OpenAI withdrew its own classifier in July 2023 at 26% accuracy with a 9%
          false-positive rate. GPTZero itself dropped perplexity and burstiness as its primary
          mechanism in 2023.
        </p>
        <p>
          <span font-bold>Never use this to accuse anyone</span> — not for grading, hiring,
          moderation or discipline. A low "human" score most often means formal, careful, technical
          or non-native writing. The only high-confidence signal here is the hidden-character panel,
          and even that proves the text was <em>manipulated</em>, not that AI wrote it.
        </p>
      </div>
    </c-card>

    <c-card title="Verdict">
      <div text-center>
        <div text-2xl fw-600 :style="{ color: verdictColour }" data-test-id="verdict">
          {{ result.verdict.label }}
        </div>
        <div mt-3 text-sm op-80>
          {{ result.verdict.summary }}
        </div>
      </div>
    </c-card>

    <c-card v-if="result.hardEvidence.length > 0" title="Hidden markers found">
      <div mb-3 text-sm op-70>
        Character-level findings. These are precise: the characters are either there or they are not.
      </div>

      <div v-for="signal of result.hardEvidence" :key="signal.id" class="signal" mb-4>
        <div flex items-center justify-between gap-3>
          <span fw-600>{{ signal.label }}</span>
          <n-tag :bordered="false" size="small" :type="signal.reliability === 'high' ? 'error' : 'warning'">
            {{ reliabilityLabels[signal.reliability] }}
          </n-tag>
        </div>
        <div mt-1 text-sm op-80>
          {{ signal.detail }}
        </div>
        <ul v-if="signal.evidence.length > 0" mt-1 text-xs op-70>
          <li v-for="item of signal.evidence" :key="item">
            {{ item }}
          </li>
        </ul>
      </div>
    </c-card>

    <c-card v-if="result.scorable" title="Style signals">
      <div mb-4 text-sm op-70>
        Each signal carries its own reliability grade. None of them is proof, and the weakest are
        labelled as such rather than folded silently into a single number.
      </div>

      <div v-for="signal of result.stylometry" :key="signal.id" class="signal" mb-4>
        <div flex items-center justify-between gap-3>
          <span fw-600>{{ signal.label }}</span>
          <n-tag :bordered="false" size="small">
            {{ reliabilityLabels[signal.reliability] }}
          </n-tag>
        </div>
        <n-progress
          mt-2
          :percentage="scorePercent(signal)"
          :height="6"
          :show-indicator="false"
          :color="scorePercent(signal) > 66 ? '#d9822b' : scorePercent(signal) > 33 ? '#a5a217' : '#18a058'"
        />
        <div mt-1 text-sm op-80>
          {{ signal.detail }}
        </div>
        <ul v-if="signal.evidence.length > 0" mt-1 text-xs op-70>
          <li v-for="item of signal.evidence" :key="item">
            {{ item }}
          </li>
        </ul>
      </div>

      <div v-if="!result.isEnglish" text-sm op-70>
        The text does not look like English, so the English phrase lists were not applied.
      </div>
    </c-card>

    <c-card v-if="result.wordCount > 0" title="Measurements">
      <c-table :data="metricRows" :headers="{ metric: 'Metric', value: 'Value' }" />
    </c-card>
  </div>
</template>

<style lang="less" scoped>
.signal {
  ul {
    list-style: disc;
    padding-left: 20px;
    word-break: break-word;
  }
}
</style>
