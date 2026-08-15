import { IconBrandTypescript } from '@tabler/icons-vue';
import { defineTool } from '../tool';
import { translate as t } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: t('tools.json-to-typescript.title'),
  path: '/json-to-typescript',
  description: t('tools.json-to-typescript.description'),
  keywords: ['json', 'typescript'],
  component: () => import('./json-to-typescript.vue'),
  icon: IconBrandTypescript,
  createdAt: new Date('2025-05-01'),
});
