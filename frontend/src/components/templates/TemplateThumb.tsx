import type { TemplatePage, TemplateElement } from '../../services/documentTemplateService';
import TemplateStaticView from './TemplateStaticView';

interface Props {
  page: TemplatePage;
  elements: TemplateElement[];
  sampleData: Record<string, string>;
  width?: number;
}

export default function TemplateThumb({ page, elements, sampleData, width = 220 }: Props) {
  const scale = width / page.width;
  return (
    <div style={{ width, height: page.height * scale, overflow: 'hidden', borderRadius: 8, pointerEvents: 'none' }} className="border border-gray-200 dark:border-slate-600">
      <TemplateStaticView page={page} elements={elements} data={sampleData} scale={scale} />
    </div>
  );
}
