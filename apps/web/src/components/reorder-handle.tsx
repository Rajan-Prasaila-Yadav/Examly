// apps/web/src/components/reorder-handle.tsx
import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface ReorderHandleProps {
  className?: string;
  title?: string;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export function ReorderHandle({
  className = '',
  title = 'Drag or click arrows to reorder',
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
}: ReorderHandleProps) {
  return (
    <div className={`flex items-center gap-1 shrink-0 select-none ${className}`}>
      {/* 4-dot (2x2) '::' visual drag grip */}
      <div
        className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all flex items-center justify-center group/handle border border-transparent hover:border-brand-200"
        title={title}
      >
        <div className="grid grid-cols-2 gap-1 w-3.5 h-3.5 items-center justify-center pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 group-hover/handle:bg-brand-600 transition-colors" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 group-hover/handle:bg-brand-600 transition-colors" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 group-hover/handle:bg-brand-600 transition-colors" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 group-hover/handle:bg-brand-600 transition-colors" />
        </div>
      </div>

      {/* Touch-Friendly & Clickable Quick Up / Down Reorder Buttons */}
      {(onMoveUp || onMoveDown) && (
        <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200/80 p-0.5 rounded-lg shadow-xs">
          {onMoveUp && (
            <button
              type="button"
              disabled={!canMoveUp}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onMoveUp();
              }}
              className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-25 rounded hover:bg-white transition-all disabled:pointer-events-none"
              title="Move Up / Earlier"
            >
              <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              disabled={!canMoveDown}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onMoveDown();
              }}
              className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-25 rounded hover:bg-white transition-all disabled:pointer-events-none"
              title="Move Down / Later"
            >
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
