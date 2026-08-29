'use client';

import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { renderMath } from '@/lib/render-math';
import { QuestionSlot, makeOptions } from '@/lib/question-templates';

type Props = {
  index: number;
  question: QuestionSlot;
  expanded: boolean;
  sections: { id: string; name: string }[];
  defaultPos: number;
  defaultNeg: number;
  onToggle: () => void;
  onChange: (q: QuestionSlot) => void;
  onDelete: () => void;
};

export function QuestionSlotCard({
  index,
  question,
  expanded,
  sections,
  defaultPos,
  defaultNeg,
  onToggle,
  onChange,
  onDelete,
}: Props) {
  const [hintOpen, setHintOpen] = useState(Boolean(question.hint));
  const [expOpen, setExpOpen] = useState(Boolean(question.shortExplanation));
  const [solOpen, setSolOpen] = useState(Boolean(question.stepByStepSolution));
  const filled = Boolean(question.contentHtml.trim());

  const setField = (patch: Partial<QuestionSlot>) => onChange({ ...question, ...patch });

  const insertMath = (snip: string) =>
    setField({ contentHtml: question.contentHtml ? `${question.contentHtml} ${snip} ` : `${snip} ` });

  return (
    <div className={`rounded-2xl border ${filled ? 'border-emerald-200 bg-white' : 'border-slate-200 bg-slate-50/80'}`}>
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between p-3.5 text-left">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold font-mono">
            Q{index + 1}
          </span>
          <span className="text-xs text-slate-700 truncate max-w-md">
            {filled ? question.contentHtml.slice(0, 80) : 'Empty template — paste, type, or fill with AI'}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <select
              value={question.questionType}
              onChange={(e) => setField({ questionType: e.target.value })}
              className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
            >
              <option value="SINGLE_CORRECT">Single Correct MCQ</option>
              <option value="MULTIPLE_CORRECT">Multiple Correct MCQ</option>
              <option value="NUMERICAL">Numerical</option>
              <option value="ASSERTION_REASON">Assertion & Reason</option>
              <option value="FILL_BLANK">Fill in the Blank</option>
              <option value="MATRIX_MATCH">Matrix Match</option>
              <option value="TRUE_FALSE">True / False</option>
              <option value="DESCRIPTIVE">Descriptive</option>
            </select>
            <button type="button" onClick={onDelete} className="p-1.5 text-slate-400 hover:text-rose-600">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1">
            {[
              { label: 'frac', snip: '$\\frac{a}{b}$' },
              { label: 'sqrt', snip: '$\\sqrt{x}$' },
              { label: 'pow', snip: '$x^2$' },
              { label: 'int', snip: '$\\int$' },
              { label: 'theta', snip: '$\\theta$' },
            ].map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => insertMath(s.snip)}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-mono"
              >
                {s.snip}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-emerald-700 mb-1">+ Marks (blank = test default {defaultPos})</label>
              <input
                type="number"
                step="0.5"
                value={question.marksPositive ?? ''}
                placeholder={String(defaultPos)}
                onChange={(e) =>
                  setField({ marksPositive: e.target.value === '' ? null : Number(e.target.value) })
                }
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-rose-700 mb-1">− Marks (blank = default {defaultNeg})</label>
              <input
                type="number"
                step="0.25"
                value={question.marksNegative ?? ''}
                placeholder={String(defaultNeg)}
                onChange={(e) =>
                  setField({ marksNegative: e.target.value === '' ? null : Number(e.target.value) })
                }
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-1">Section</label>
              <select
                value={question.sectionId}
                onChange={(e) => setField({ sectionId: e.target.value })}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
              >
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            rows={3}
            value={question.contentHtml}
            onChange={(e) => setField({ contentHtml: e.target.value })}
            placeholder="Question statement (supports $LaTeX$)..."
            className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl font-mono"
          />

          <div>
            <label className="text-[10px] font-medium text-slate-600 flex items-center gap-1 mb-1">
              <ImageIcon className="w-3 h-3" /> Diagram URL
            </label>
            <input
              type="text"
              value={question.diagramUrl}
              onChange={(e) => setField({ diagramUrl: e.target.value })}
              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-mono"
            />
          </div>

          {question.contentHtml.trim() && (
            <div className="p-3 rounded-xl bg-white border border-brand-200 text-xs">{renderMath(question.contentHtml)}</div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Options (click letter for correct)</span>
            <button
              type="button"
              onClick={() => setField({ options: makeOptions(question.options.length + 1, question.options) })}
              className="text-[11px] font-bold text-brand-700 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add option
            </button>
          </div>

          {question.options.map((opt, idx) => (
            <div
              key={opt.id}
              className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                opt.isCorrect ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  const multi = question.questionType === 'MULTIPLE_CORRECT';
                  setField({
                    options: question.options.map((o, i) => ({
                      ...o,
                      isCorrect: multi ? (i === idx ? !o.isCorrect : o.isCorrect) : i === idx,
                    })),
                  });
                }}
                className={`w-7 h-7 rounded-full text-xs font-bold ${
                  opt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {opt.optionLabel}
              </button>
              <input
                type="text"
                value={opt.contentHtml}
                onChange={(e) => {
                  const options = [...question.options];
                  options[idx] = { ...options[idx], contentHtml: e.target.value };
                  setField({ options });
                }}
                className="flex-1 text-xs bg-transparent font-mono focus:outline-none"
                placeholder={`Option ${opt.optionLabel}`}
              />
              {question.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => setField({ options: question.options.filter((_, i) => i !== idx) })}
                  className="text-slate-300 hover:text-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          <button type="button" onClick={() => setHintOpen(!hintOpen)} className="text-xs font-bold text-amber-900">
            💡 Hint {hintOpen ? '▲' : '▼'}
          </button>
          {hintOpen && (
            <input
              value={question.hint}
              onChange={(e) => setField({ hint: e.target.value })}
              className="w-full text-xs p-2 bg-white border rounded-xl"
              placeholder="Hint"
            />
          )}
          <button type="button" onClick={() => setExpOpen(!expOpen)} className="text-xs font-bold text-blue-900 block">
            💬 Short explanation {expOpen ? '▲' : '▼'}
          </button>
          {expOpen && (
            <input
              value={question.shortExplanation}
              onChange={(e) => setField({ shortExplanation: e.target.value })}
              className="w-full text-xs p-2 bg-white border rounded-xl"
              placeholder="Short explanation"
            />
          )}
          <button type="button" onClick={() => setSolOpen(!solOpen)} className="text-xs font-bold text-purple-900 block">
            📋 Step-by-step {solOpen ? '▲' : '▼'}
          </button>
          {solOpen && (
            <textarea
              rows={3}
              value={question.stepByStepSolution}
              onChange={(e) => setField({ stepByStepSolution: e.target.value })}
              className="w-full text-xs p-2 bg-white border rounded-xl font-mono"
              placeholder="Step-by-step solution"
            />
          )}
        </div>
      )}
    </div>
  );
}
