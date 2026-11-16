import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AdditionalContextBox } from '../types/clamir.ts';

interface AdditionalContextManagerProps {
  contexts: AdditionalContextBox[];
  onChange: (next: AdditionalContextBox[]) => void;
  compact?: boolean;
}

export function createEmptyContextBox(): AdditionalContextBox {
  return {
    id: `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: '',
    content: '',
  };
}

export function serializeAdditionalContexts(contexts: AdditionalContextBox[]): string {
  return contexts
    .filter((c) => c.content.trim())
    .map((c, idx) => {
      const label = c.title.trim() || `Context ${idx + 1}`;
      return `${label}: ${c.content.trim()}`;
    })
    .join('\n\n');
}

export const AdditionalContextManager: React.FC<AdditionalContextManagerProps> = ({
  contexts,
  onChange,
  compact = false,
}) => {
  const filledCount = contexts.filter((c) => c.content.trim().length > 0).length;

  const handleAddBox = () => {
    onChange([...contexts, createEmptyContextBox()]);
  };

  const handleUpdateBox = (id: string, field: 'title' | 'content', value: string) => {
    onChange(
      contexts.map((box) => (box.id === id ? { ...box, [field]: value } : box))
    );
  };

  const handleRemoveBox = (id: string) => {
    if (contexts.length <= 1) {
      onChange([createEmptyContextBox()]);
      return;
    }
    onChange(contexts.filter((box) => box.id !== id));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold text-[#111827] truncate">
            Additional Context
          </span>
          {filledCount > 0 && (
            <span className="text-[10px] font-mono text-[#6B7280] tabular-nums shrink-0">
              {filledCount} saved
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleAddBox}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#111827] hover:underline cursor-pointer shrink-0 whitespace-nowrap"
        >
          <Plus className="w-3 h-3" />
          <span>Add Context</span>
        </button>
      </div>

      <div className="space-y-2">
        {contexts.map((box, index) => (
          <div
            key={box.id}
            className="bg-white border border-[#E5E7EB] rounded-md p-2.5 space-y-1.5 focus-within:border-[#000000] transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={box.title}
                onChange={(e) => handleUpdateBox(box.id, 'title', e.target.value)}
                placeholder={`Context ${index + 1} label (e.g., Target Market, Constraints)`}
                className="flex-1 min-w-0 text-[11px] font-semibold text-[#111827] bg-transparent border-b border-transparent focus:border-[#E5E7EB] pb-0.5 focus:outline-none placeholder:text-[#9CA3AF] placeholder:font-normal"
              />
              <button
                type="button"
                onClick={() => handleRemoveBox(box.id)}
                className="p-1 text-[#6B7280] hover:text-red-600 rounded cursor-pointer shrink-0"
                title={contexts.length <= 1 ? 'Clear context box' : 'Remove context box'}
                aria-label="Remove context box"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <textarea
              value={box.content}
              onChange={(e) => handleUpdateBox(box.id, 'content', e.target.value)}
              rows={compact ? 2 : 3}
              placeholder="Add background details, goals, pricing rules, or instructions for Clemir AI..."
              className="w-full text-xs text-[#111827] bg-transparent resize-y focus:outline-none placeholder:text-[#9CA3AF] leading-relaxed"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
