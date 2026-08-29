export type QuestionSlot = {
  id: string;
  sectionId: string;
  questionType: string;
  contentHtml: string;
  diagramUrl: string;
  marksPositive: number | null;
  marksNegative: number | null;
  options: { id: string; optionLabel: string; contentHtml: string; isCorrect: boolean }[];
  hint: string;
  shortExplanation: string;
  stepByStepSolution: string;
};

export function optionLetters(count: number) {
  return Array.from({ length: Math.max(2, count) }, (_, i) => String.fromCharCode(65 + i));
}

export function makeOptions(count: number, existing?: QuestionSlot['options']) {
  const letters = optionLetters(count);
  return letters.map((label, i) => {
    const prev = existing?.[i];
    return {
      id: prev?.id || `opt_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      optionLabel: label,
      contentHtml: prev?.contentHtml || '',
      isCorrect: prev ? !!prev.isCorrect : i === 0,
    };
  });
}

export function makeEmptySlot(opts: {
  sectionId: string;
  optionCount: number;
  questionType?: string;
}): QuestionSlot {
  return {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sectionId: opts.sectionId,
    questionType: opts.questionType || 'SINGLE_CORRECT',
    contentHtml: '',
    diagramUrl: '',
    marksPositive: null,
    marksNegative: null,
    options: makeOptions(opts.optionCount),
    hint: '',
    shortExplanation: '',
    stepByStepSolution: '',
  };
}

export function isSlotFilled(q: { contentHtml?: string }) {
  return Boolean(q.contentHtml && q.contentHtml.trim());
}

export function mapAiQuestionToSlot(
  q: any,
  sectionId: string,
  optionCount: number,
  defaults: { marksPositive: number; marksNegative: number },
): QuestionSlot {
  const options =
    Array.isArray(q.options) && q.options.length > 0
      ? q.options.map((opt: any, i: number) => ({
          id: `ai-opt-${Date.now()}-${i}`,
          optionLabel: opt.optionLabel || String.fromCharCode(65 + i),
          contentHtml: opt.contentHtml || '',
          isCorrect: !!opt.isCorrect,
        }))
      : makeOptions(optionCount);
  return {
    id: `ai-q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sectionId,
    questionType: q.questionType || 'SINGLE_CORRECT',
    contentHtml: q.contentHtml || '',
    diagramUrl: '',
    marksPositive: q.marksPositive != null ? Number(q.marksPositive) : defaults.marksPositive,
    marksNegative: q.marksNegative != null ? Number(q.marksNegative) : defaults.marksNegative,
    options,
    hint: q.hint || '',
    shortExplanation: q.shortExplanation || '',
    stepByStepSolution: q.stepByStepSolution || '',
  };
}

export function mergeParsedIntoSlots(
  slots: QuestionSlot[],
  parsed: any[],
  sectionId: string,
  optionCount: number,
  defaults: { marksPositive: number; marksNegative: number },
): QuestionSlot[] {
  const next = slots.map((s) => ({ ...s, options: s.options.map((o) => ({ ...o })) }));
  let pi = 0;
  for (let i = 0; i < next.length && pi < parsed.length; i++) {
    if (!isSlotFilled(next[i])) {
      next[i] = { ...mapAiQuestionToSlot(parsed[pi], sectionId, optionCount, defaults), id: next[i].id };
      pi += 1;
    }
  }
  while (pi < parsed.length) {
    next.push(mapAiQuestionToSlot(parsed[pi], sectionId, optionCount, defaults));
    pi += 1;
  }
  return next;
}

export function padSlots(
  slots: QuestionSlot[],
  targetCount: number,
  sectionId: string,
  optionCount: number,
  questionType: string,
): QuestionSlot[] {
  if (targetCount > slots.length) {
    const extra = Array.from({ length: targetCount - slots.length }, () =>
      makeEmptySlot({ sectionId, optionCount, questionType }),
    );
    return [...slots, ...extra];
  }
  if (targetCount < slots.length) {
    const filled = slots.filter(isSlotFilled);
    if (filled.length > targetCount) return slots;
    const next = [...slots];
    while (next.length > targetCount && !isSlotFilled(next[next.length - 1])) {
      next.pop();
    }
    return next;
  }
  return slots;
}

export function lastJoinDate(end: Date, durationMinutes: number) {
  return new Date(end.getTime() - durationMinutes * 60 * 1000);
}
