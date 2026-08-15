import { Eraser } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.ai-watermark-remover.title'),
  path: '/ai-watermark-remover',
  description: translate('tools.ai-watermark-remover.description'),
  keywords: [
    'ai',
    'watermark',
    'remover',
    'invisible',
    'zero-width',
    'zwsp',
    'unicode',
    'sanitizer',
    'homoglyph',
    'confusable',
    'steganography',
    'ascii smuggling',
    'prompt injection',
    'clean',
    'strip',
  ],
  component: () => import('./ai-watermark-remover.vue'),
  icon: Eraser,
  redirectFrom: ['/unicode-sanitizer', '/invisible-character-remover'],
  createdAt: new Date('2026-08-15'),
});
