// apps/web/src/lib/stores/exam.store.ts
import { create } from 'zustand';

interface ExamUIState {
  currentQuestionIndex: number;
  setCurrentQuestionIndex: (index: number) => void;
  nextQuestion: (maxIndex: number) => void;
  prevQuestion: () => void;
  timeRemainingSeconds: number;
  setTimeRemaining: (seconds: number) => void;
  decrementTimer: () => void;
  draftAnswers: Record<string, string[]>; // questionId -> selectedOptionIds
  setDraftAnswer: (questionId: string, optionIds: string[]) => void;
  toggleOptionSelection: (questionId: string, optionId: string, isSingleChoice: boolean) => void;
  markedForReview: Record<string, boolean>; // questionId -> isMarked
  toggleMarkedForReview: (questionId: string) => void;
  resetExamState: () => void;
}

export const useExamStore = create<ExamUIState>((set) => ({
  currentQuestionIndex: 0,
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: Math.max(0, index) }),
  nextQuestion: (maxIndex) =>
    set((state) => ({
      currentQuestionIndex: Math.min(maxIndex, state.currentQuestionIndex + 1),
    })),
  prevQuestion: () =>
    set((state) => ({
      currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1),
    })),
  timeRemainingSeconds: 0,
  setTimeRemaining: (seconds) => set({ timeRemainingSeconds: seconds }),
  decrementTimer: () =>
    set((state) => ({
      timeRemainingSeconds: Math.max(0, state.timeRemainingSeconds - 1),
    })),
  draftAnswers: {},
  setDraftAnswer: (questionId, optionIds) =>
    set((state) => ({
      draftAnswers: { ...state.draftAnswers, [questionId]: optionIds },
    })),
  toggleOptionSelection: (questionId, optionId, isSingleChoice) =>
    set((state) => {
      const current = state.draftAnswers[questionId] || [];
      let next: string[];
      if (isSingleChoice) {
        next = current.includes(optionId) ? [] : [optionId];
      } else {
        next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
      }
      return {
        draftAnswers: { ...state.draftAnswers, [questionId]: next },
      };
    }),
  markedForReview: {},
  toggleMarkedForReview: (questionId) =>
    set((state) => ({
      markedForReview: {
        ...state.markedForReview,
        [questionId]: !state.markedForReview[questionId],
      },
    })),
  resetExamState: () =>
    set({
      currentQuestionIndex: 0,
      timeRemainingSeconds: 0,
      draftAnswers: {},
      markedForReview: {},
    }),
}));
