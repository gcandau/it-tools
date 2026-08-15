import { Robot } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.ai-text-detector.title'),
  path: '/ai-text-detector',
  description: translate('tools.ai-text-detector.description'),
  keywords: [
    'ai',
    'detector',
    'detection',
    'generated',
    'chatgpt',
    'llm',
    'stylometry',
    'burstiness',
    'perplexity',
    'mtld',
    'watermark',
    'invisible',
    'plagiarism',
  ],
  component: () => import('./ai-text-detector.vue'),
  icon: Robot,
  createdAt: new Date('2026-08-15'),
});
