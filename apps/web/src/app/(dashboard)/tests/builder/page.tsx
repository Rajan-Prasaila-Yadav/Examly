'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Sparkles,
  Save,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Calculator,
  HelpCircle,
  Eye,
  FileText,
  RotateCcw,
  Check,
  Play,
  Award,
  Clock,
  Layers,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { renderMath } from '@/lib/render-math';

export default function SplitPaneQuestionBuilderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isStudent =
    user?.role === 'STUDENT' ||
    user?.role === 'Student' ||
    (typeof user?.role === 'object' && ((user.role as any)?.name === 'STUDENT' || (user.role as any)?.code === 'STUDENT'));

  useEffect(() => {
    if (isStudent) {
      router.replace('/tests');
    }
  }, [isStudent, router]);

  const [activeView, setActiveView] = useState<'tests' | 'authoring'>('tests');
  const [tests, setTests] = useState<any[]>([]);

  // Split Pane State
  const [questionType, setQuestionType] = useState('SINGLE_CORRECT');
  const [section, setSection] = useState('Physics');
  const [positiveMarks, setPositiveMarks] = useState(4.0);
  const [negativeMarks, setNegativeMarks] = useState(1.0);

  const [statementHtml, setStatementHtml] = useState(
    'A particle moves along the x-axis with acceleration $a(t) = 6t - 4$. If its initial velocity $v(0) = 3\\text{ m/s}$, find the velocity at $t = 2\\text{ s}$:',
  );

  const [options, setOptions] = useState([
    { id: '1', label: 'A', content: '$7\\text{ m/s}$', isCorrect: true },
    { id: '2', label: 'B', content: '$11\\text{ m/s}$', isCorrect: false },
    { id: '3', label: 'C', content: '$4\\text{ m/s}$', isCorrect: false },
    { id: '4', label: 'D', content: '$15\\text{ m/s}$', isCorrect: false },
  ]);

  const [explanation, setExplanation] = useState(
    'Using integration: $v(t) = \\int a(t)dt = 3t^2 - 4t + C$.\nGiven $v(0) = 3 \\implies C = 3$.\nAt $t = 2$: $v(2) = 3(2)^2 - 4(2) + 3 = 12 - 8 + 3 = 7\\text{ m/s}$.',
  );

  const [isSaved, setIsSaved] = useState(false);

  const fetchTests = async () => {
    try {
      const res = await api.get('/tests');
      setTests(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);



  const handleOptionCorrectToggle = (id: string) => {
    if (questionType === 'SINGLE_CORRECT') {
      setOptions(options.map((opt) => ({ ...opt, isCorrect: opt.id === id })));
    } else {
      setOptions(options.map((opt) => (opt.id === id ? { ...opt, isCorrect: !opt.isCorrect } : opt)));
    }
  };

  const handleInsertMath = (snippet: string) => {
    setStatementHtml((prev) => prev + ` ${snippet} `);
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleTogglePublish = async (testId: string) => {
    try {
      await api.post(`/tests/${testId}/publish`);
      fetchTests();
    } catch (e) {
      alert('Failed to toggle publish');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Test & Examination Engine</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            4-Step Wizard, Split-Pane LaTeX Question Authoring, Live Anti-Cheat Student Runner, and Ranked Leaderboards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/tests/create"
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-600/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Create New Test (4-Step Wizard)
          </Link>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-200/70 rounded-2xl w-fit">
        <button
          onClick={() => setActiveView('tests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeView === 'tests' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Mock Tests ({tests.length})</span>
        </button>

        <button
          onClick={() => setActiveView('authoring')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeView === 'authoring' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>Split-Pane Question Authoring</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {/* VIEW 1: ALL TESTS ROSTER WITH LAUNCH RUNNER & FULL CRUD */}
      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {activeView === 'tests' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 font-mono text-[11px] font-bold border border-brand-200/60">
                    {t.batch?.code || 'CEE-A'}
                  </span>

                  <button
                    onClick={() => handleTogglePublish(t.id)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                      t.isPublished
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {t.isPublished ? '● Live Published' : '○ Draft'}
                  </button>
                </div>

                <Link href={`/tests/${t.id}`}>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                    {t.title}
                  </h3>
                </Link>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {t.description || 'Full timed mock exam with anti-cheat monitoring.'}
                </p>

                {/* Meta Chips */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-brand-500" />
                    <span>{t.durationMinutes} Mins</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-accent-indigo" />
                    <span>{t.totalMarks} Marks</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  href={`/tests/${t.id}`}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                >
                  Details / Leaderboard
                </Link>

                <Link
                  href={`/tests/${t.id}/runner`}
                  className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-1.5 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> Take Exam
                </Link>
              </div>
            </div>
          ))}

          {tests.length === 0 && (
            <div className="col-span-full bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No mock tests created yet</h3>
              <p className="text-xs text-slate-500 mt-1">Click "+ Create New Test (4-Step Wizard)" above to start.</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {/* VIEW 2: SPLIT-PANE QUESTION AUTHORING SUITE */}
      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {activeView === 'authoring' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ── LEFT PANE: Question Statement & Math Formula Tools ── */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-600" /> Question Statement & Math Editor
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-slate-400">Section:</span>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                >
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Zoology">Zoology</option>
                  <option value="Botany">Botany</option>
                </select>
              </div>
            </div>

            {/* Question Type & Marks Row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Question Type</label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="SINGLE_CORRECT">Single Correct MCQ</option>
                  <option value="MULTIPLE_CORRECT">Multiple Correct (1+)</option>
                  <option value="NUMERICAL">Numerical Value</option>
                  <option value="ASSERTION_REASON">Assertion & Reason</option>
                  <option value="MATRIX_MATCH">Matrix Match</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Marks (+ve)</label>
                <input
                  type="number"
                  step="0.5"
                  value={positiveMarks}
                  onChange={(e) => setPositiveMarks(parseFloat(e.target.value))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Negative (-ve)</label>
                <input
                  type="number"
                  step="0.25"
                  value={negativeMarks}
                  onChange={(e) => setNegativeMarks(parseFloat(e.target.value))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-semibold text-rose-600"
                />
              </div>
            </div>

            {/* Quick KaTeX Math Formula Ribbon */}
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                <Calculator className="w-3 h-3 text-brand-600" /> Instant Math Symbols:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Fraction', snippet: '$\\frac{a}{b}$' },
                  { label: 'Square Root', snippet: '$\\sqrt{x}$' },
                  { label: 'Exponent', snippet: '$x^2$' },
                  { label: 'Integral', snippet: '$\\int f(x)dx$' },
                  { label: 'Sum', snippet: '$\\sum_{i=1}^{n}$' },
                  { label: 'Alpha (α)', snippet: '$\\alpha$' },
                  { label: 'Beta (β)', snippet: '$\\beta$' },
                  { label: 'Theta (θ)', snippet: '$\\theta$' },
                  { label: 'Infinity (∞)', snippet: '$\\infty$' },
                ].map((sym) => (
                  <button
                    key={sym.label}
                    type="button"
                    onClick={() => handleInsertMath(sym.snippet)}
                    className="px-2 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 border border-slate-200 rounded-lg text-[10px] font-mono transition-all"
                  >
                    {sym.snippet}
                  </button>
                ))}
              </div>
            </div>

            {/* Statement Textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Question Statement (Supports Markdown & $KaTeX$ formulas)
              </label>
              <textarea
                rows={4}
                value={statementHtml}
                onChange={(e) => setStatementHtml(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-mono"
              />
            </div>

            {/* Live Math Render Preview Box */}
            <div className="p-4 rounded-2xl bg-brand-50/40 border border-brand-100/80">
              <span className="block text-[10px] font-bold text-brand-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-brand-600" /> Student Live View Preview:
              </span>
              <div className="text-xs text-slate-800 leading-relaxed font-sans">
                {renderMath(statementHtml)}
              </div>
            </div>
          </div>

          {/* ── RIGHT PANE: Options, Correct Answer Toggles & Step-by-Step Solution ── */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Option Choices & Solution Key
              </h2>
              <span className="text-[10px] text-slate-400">Click circle to mark correct key</span>
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {options.map((opt) => (
                <div
                  key={opt.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    opt.isCorrect
                      ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/10'
                      : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Correct Selector Checkbox/Radio */}
                    <button
                      type="button"
                      onClick={() => handleOptionCorrectToggle(opt.id)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        opt.isCorrect
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>

                    <input
                      type="text"
                      value={opt.content}
                      onChange={(e) => {
                        const newContent = e.target.value;
                        setOptions(options.map((o) => (o.id === opt.id ? { ...o, content: newContent } : o)));
                      }}
                      placeholder={`Option ${opt.label} text or $KaTeX$...`}
                      className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />

                    {opt.isCorrect && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        Correct
                      </span>
                    )}
                  </div>

                  {/* Option Live KaTeX Render Preview */}
                  <div className="mt-2 pl-9 text-xs text-slate-700 font-sans">
                    {renderMath(opt.content)}
                  </div>
                </div>
              ))}
            </div>

            {/* Step-by-Step Solution / Hint */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-brand-600" /> Step-by-Step Explanation & Hints (Shown in Answer Key)
              </label>
              <textarea
                rows={3}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* Explanation Live Preview */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Solution Preview:
              </span>
              <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                {renderMath(explanation)}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-2"
              >
                {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
                {isSaved ? 'Question Saved!' : 'Save Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
