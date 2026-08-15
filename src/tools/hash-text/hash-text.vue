<script setup lang="ts">
import InputCopyable from '../../components/InputCopyable.vue';
import {
  type DigestEncoding,
  type HashAlgorithm,
  hashAlgorithmNames,
  hashText,
} from './hash-text.service';

import { useQueryParam } from '@/composable/queryParams';

const encoding = useQueryParam<DigestEncoding>({ defaultValue: 'Hex', name: 'encoding' });
const clearText = ref('');

const algoNames = hashAlgorithmNames;

function digest(algorithm: HashAlgorithm, text: string) {
  return hashText({ algorithm, text, encoding: encoding.value });
}
</script>

<template>
  <div>
    <c-card>
      <c-input-text v-model:value="clearText" multiline raw-text placeholder="Your string to hash..." rows="3" autosize autofocus label="Your text to hash:" />

      <n-divider />

      <c-select
        v-model:value="encoding"
        mb-4
        label="Digest encoding"
        :options="[
          {
            label: 'Binary (base 2)',
            value: 'Bin',
          },
          {
            label: 'Hexadecimal (base 16)',
            value: 'Hex',
          },
          {
            label: 'Base64 (base 64)',
            value: 'Base64',
          },
          {
            label: 'Base64url (base 64 with url safe chars)',
            value: 'Base64url',
          },
        ]"
      />

      <div v-for="algo in algoNames" :key="algo" style="margin: 5px 0">
        <n-input-group>
          <n-input-group-label style="flex: 0 0 120px">
            {{ algo }}
          </n-input-group-label>
          <InputCopyable :value="digest(algo, clearText)" readonly />
        </n-input-group>
      </div>
    </c-card>
  </div>
</template>
