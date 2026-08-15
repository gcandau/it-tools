import { useRouteQuery } from '@vueuse/router';
import { computed } from 'vue';
import { type StorageLike, type UseStorageOptions, useStorage } from '@vueuse/core';

export { useITStorage, useQueryParam, useQueryParamOrStorage };

const transformers = {
  number: {
    fromQuery: (value: string) => Number(value),
    toQuery: (value: number) => String(value),
  },
  string: {
    fromQuery: (value: string) => value,
    toQuery: (value: string) => value,
  },
  boolean: {
    fromQuery: (value: string) => value.toLowerCase() === 'true',
    toQuery: (value: boolean) => (value ? 'true' : 'false'),
  },
  object: {
    fromQuery: (value: string) => {
      return JSON.parse(value);
    },
    toQuery: (value: object) => JSON.stringify(value),
  },
};

/**
 * `tool` is accepted and ignored. Tools ported from the sharevb fork pass it to namespace the value
 * against that fork's per-tool default-settings store, which this fork does not have; accepting the
 * property keeps those tools unmodified rather than forcing a diff on every one of them.
 */
function useQueryParam<T>({ name, defaultValue }: { tool?: string; name: string; defaultValue: T }) {
  const type = typeof defaultValue;
  const transformer = transformers[type as keyof typeof transformers] ?? transformers.string;

  const proxy = useRouteQuery(name, transformer.toQuery(defaultValue as never));

  return computed<T>({
    get() {
      return transformer.fromQuery(proxy.value) as unknown as T;
    },
    set(value) {
      proxy.value = transformer.toQuery(value as never);
    },
  });
}

/** Persist a value in local storage. Same signature as `useStorage`, kept for ported tools. */
function useITStorage<T>(
  key: string,
  defaults: T,
  storage?: StorageLike,
  options?: UseStorageOptions<T>,
) {
  return useStorage<T>(key, defaults, storage, options);
}

function useQueryParamOrStorage<T>({ name, storageName, defaultValue }: { tool?: string; name: string; storageName: string; defaultValue: T }) {
  const type = typeof defaultValue;
  const transformer = transformers[type as keyof typeof transformers] ?? transformers.string;

  const storageRef = useStorage(storageName, defaultValue);
  const proxyDefaultValue = transformer.toQuery(defaultValue as never);
  const proxy = useRouteQuery(name, proxyDefaultValue);

  const r = ref(defaultValue);

  watch(r,
    (value) => {
      proxy.value = transformer.toQuery(value as never);
      storageRef.value = value as never;
    },
    { deep: true });

  r.value = (proxy.value && proxy.value !== proxyDefaultValue
    ? transformer.fromQuery(proxy.value) as unknown as T
    : storageRef.value as T) as never;

  return r;
}
