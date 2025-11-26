import { ZoyaCard } from '../types';

// SuperMemo 2 (SM-2) Algorithm Implementation adapted for Zoya

export const GRADE = {
  AGAIN: 0, // Forgot, restart
  HARD: 1,  // Hard, but remembered
  GOOD: 2,  // Good, remembered with hesitation
  EASY: 3,  // Easy, remembered instantly
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const calculateNextReview = (card: ZoyaCard, grade: number): ZoyaCard => {
  let { interval = 0, repetition = 0, easeFactor = 2.5 } = card;
  const now = Date.now();

  if (grade === GRADE.AGAIN) {
    repetition = 0;
    interval = 1; // Review tomorrow
  } else {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition += 1;
  }

  // Update Ease Factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  // Mapping our 0-3 scale to SM-2's 0-5 scale roughly:
  // Our 0 (Again) -> SM 0
  // Our 1 (Hard)  -> SM 3
  // Our 2 (Good)  -> SM 4
  // Our 3 (Easy)  -> SM 5
  let smGrade = 0;
  if (grade === GRADE.HARD) smGrade = 3;
  if (grade === GRADE.GOOD) smGrade = 4;
  if (grade === GRADE.EASY) smGrade = 5;

  if (grade !== GRADE.AGAIN) {
      easeFactor = easeFactor + (0.1 - (5 - smGrade) * (0.08 + (5 - smGrade) * 0.02));
      if (easeFactor < 1.3) easeFactor = 1.3;
  }

  return {
    ...card,
    interval,
    repetition,
    easeFactor,
    nextReviewDate: now + (interval * DAY_IN_MS)
  };
};

export const getDueCards = (cards: ZoyaCard[]): ZoyaCard[] => {
  const now = Date.now();
  return cards.filter(card => {
    // If no review date, it's new -> show it
    if (!card.nextReviewDate) return true;
    // If review date is in the past -> show it
    return card.nextReviewDate <= now;
  }).sort((a, b) => {
      // Prioritize overdue cards
      return (a.nextReviewDate || 0) - (b.nextReviewDate || 0);
  });
};

