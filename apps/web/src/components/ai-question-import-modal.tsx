'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Bot, Loader2, Upload, Wand2, X, Check } from 'lucide-react';
import { renderMath } from '@/lib/render-math';

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (questions: any[]) => void;
};

export function AiQuestionImportModal({ open, onClose, onApply }: Props) {
  const [rawText, setRawText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [parsed, setParsed] = useState<any[] | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const reset = () => {
    setRawText('');
    setFiles([]);
    setParsed(null);
    setError('');
    setIsParsing(false);
  };

  const handleParse = async () => {
    if (!rawText.trim() && files.length === 0) return;
    setIsParsing(true);
    setError('');
    setParsed(null);
    try {
      const form = new FormData();
      if (rawText.trim()) form.append('rawText', rawText);
      files.forEach((f) => form.append('files', f));
      const res = await api.post('/tests/ai-parse', form);
      setParsed(res.data.parsedQuestions || []);
    } catch (e: any) {
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' ') : msg || 'AI parsing failed. Check GEMINI_API_KEY and restart the API.');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-violet-600" /> Fill questions with Gemini
          </h3>
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Paste broken/copied text, or upload a PDF and photos of the paper. Gemini only structures{' '}
          <strong>your</strong> questions (statement, options, correct key, hint, explanation, step solution) and
          repairs LaTeX. It does not add extra questions.
        </p>

        <textarea
          rows={6}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste questions here (LaTeX can be broken)..."
          className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        />

        <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100">
          <Upload className="w-4 h-4 text-violet-600" />
          PDF or images
          <input
            type="file"
            accept="application/pdf,image/*"
            multiple
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
        </label>
        {files.length > 0 && (
          <p className="text-[11px] text-slate-500">
            {files.length} file(s): {files.map((f) => f.name).join(', ')}
          </p>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">{error}</div>
        )}

        <button
          type="button"
          onClick={handleParse}
          disabled={isParsing || (!rawText.trim() && files.length === 0)}
          className="w-full py-2.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
          {isParsing ? 'Parsing with Gemini…' : 'Parse into question templates'}
        </button>

        {parsed && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              {parsed.length} question{parsed.length === 1 ? '' : 's'} ready from your material.
            </p>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {parsed.map((q, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-mono font-bold text-slate-700">Q{idx + 1}</span>
                  <div className="mt-1 text-slate-800">{renderMath(q.contentHtml || '')}</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                onApply(parsed);
                reset();
                onClose();
              }}
              className="w-full py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Fill templates with these questions
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
