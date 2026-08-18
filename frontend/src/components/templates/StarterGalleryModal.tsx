import Modal from '../ui/Modal';
import TemplateThumb from './TemplateThumb';
import { STUDENT_ID_CARD_STARTERS, instantiateStarter } from '../../lib/idCardStarterTemplates';
import type { TemplateElement, TemplatePage } from '../../services/documentTemplateService';

export type StarterPick = { name: string; page: TemplatePage; elements: TemplateElement[] } | undefined;

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (initial: StarterPick) => void;
  sampleData: Record<string, string>;
}

export default function StarterGalleryModal({ open, onClose, onPick, sampleData }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Start a new student ID card"
      subtitle="Pick a design to start from. Every color, field, and position stays fully editable after."
      size="xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onPick(undefined)}
          className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-slate-700/40 transition-colors text-left"
        >
          <div className="w-full aspect-[85.6/54] rounded-lg border border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center text-gray-300 dark:text-slate-600">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900 dark:text-slate-100">Blank canvas</p>
            <p className="text-xs text-gray-400 dark:text-slate-500">Design from scratch</p>
          </div>
        </button>

        {STUDENT_ID_CARD_STARTERS.map((starter) => (
          <button
            key={starter.id}
            type="button"
            onClick={() => onPick(instantiateStarter(starter))}
            className="flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all text-left"
          >
            <TemplateThumb page={starter.page} elements={starter.elements} sampleData={sampleData} width={230} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: starter.accentColor }} />
                <p className="font-medium text-sm text-gray-900 dark:text-slate-100">{starter.name}</p>
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{starter.description}</p>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
