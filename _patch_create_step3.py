from pathlib import Path

p = Path(r"c:/Users/rajan/Desktop/Examly/apps/web/src/app/(dashboard)/tests/create/page.tsx")
text = p.read_text(encoding="utf-8")

marker3 = "      {/* STEP 3: QUESTION BUILDER"
marker4 = "      {/* ══════════════════════════════════════════════════════════════════════════════ */}\n      {/* STEP 4: REVIEW"
start = text.index(marker3)
end = text.index(marker4)

step3 = r'''      {/* STEP 3: QUESTION BUILDER (SCR-ADM-12) */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-brand-600" /> Step 3: Question templates
            </h2>
            <span className="text-xs font-bold font-mono text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
              {filledCount} filled / {authoredQuestions.length} templates
            </span>
          </div>

          {aiToast && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              {aiToast}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setIsBulkModalOpen(true)} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-brand-600" /> Bulk Upload (CSV)
              </button>
              <button type="button" onClick={() => setIsAiModalOpen(true)} className="px-3.5 py-2 bg-violet-50 hover:bg-violet-100 border border-violet-300 text-violet-800 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5" /> Fill with Gemini
              </button>
              <button type="button" onClick={() => setNewSectionModal(true)} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-purple-600" /> Add Section
              </button>
              <button type="button" onClick={handleAddQuestionSlot} className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add question template
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
            {sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSectionId(sec.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                  activeSectionId === sec.id
                    ? 'bg-purple-50 text-purple-800 border border-purple-300'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {sec.name} ({authoredQuestions.filter((q) => q.sectionId === sec.id && q.contentHtml.trim()).length})
              </button>
            ))}
          </div>

          <p className="text-[11px] text-slate-500">
            Templates match Total Questions from settings. Empty marks use +{positiveMarkRate} / -{negDefault}. Extra templates increase the total.
          </p>

          <div className="space-y-2">
            {authoredQuestions.map((q, idx) => (
              <QuestionSlotCard
                key={q.id}
                index={idx}
                question={q}
                expanded={expandedSlot === idx}
                sections={sections}
                defaultPos={Number(positiveMarkRate)}
                defaultNeg={negDefault}
                onToggle={() => setExpandedSlot(expandedSlot === idx ? null : idx)}
                onChange={(next) => {
                  const copy = [...authoredQuestions];
                  copy[idx] = next;
                  setAuthoredQuestions(copy);
                }}
                onDelete={() => handleDeleteQuestion(idx)}
              />
            ))}
          </div>

          <div className="pt-3 flex justify-between">
            <button onClick={() => setCurrentStep(2)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl">
              ← Back
            </button>
            <button onClick={() => setCurrentStep(4)} className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md">
              Next: Review & Launch →
            </button>
          </div>
        </div>
      )}

'''

text = text[:start] + step3 + text[end:]

# last-join notice after duration grid
needle = '''            </div>
          </div>

          {/* Questions Count & Marking Rates */}'''
insert = '''            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
            Students must have a full <strong>{durationMinutes} minutes</strong> before the end time.
            Last start allowed: <strong>{lastJoin.toLocaleString()}</strong>. Instant Live sets start to now and keeps this end window if it is long enough.
          </div>

          {/* Questions Count & Marking Rates */}'''
if needle not in text:
    raise SystemExit('duration needle not found')
text = text.replace(needle, insert, 1)

# AI modal before final closing
close = '''      )}
    </div>
  );
}
'''
modal = '''      )}

      <AiQuestionImportModal
        open={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApply={applyParsedQuestions}
      />
    </div>
  );
}
'''
if not text.endswith(close) and close not in text:
    # try without exact
    idx = text.rfind('    </div>\n  );\n}')
    print('close idx', idx)
else:
    text = text.replace(close, modal, 1)

# review step question count
text = text.replace(
    '{authoredQuestions.length} Questions ({sections.length} Sections)',
    '{filledCount} filled of {authoredQuestions.length} templates ({sections.length} sections)',
)

p.write_text(text, encoding="utf-8")
print('patched', p, 'chars', len(text))
