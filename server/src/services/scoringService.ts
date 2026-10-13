import { Question, OptionKey } from '@quizx/shared';

export interface ScoreResult {
  isCorrect: boolean;
  pointsAwarded: number;
}

export class ScoringService {
  /**
   * Calculates points awarded for a given answer.
   * Basic model: Configured question points for correct, 0 for incorrect.
   */
  static calculateScore(
    question: Question,
    selectedOption: OptionKey
  ): ScoreResult {
    const isCorrect = selectedOption === question.correct_option;
    const pointsAwarded = isCorrect ? question.points : 0;

    return {
      isCorrect,
      pointsAwarded
    };
  }

  /**
   * Calculate statistics for a closed question.
   */
  static calculateQuestionStats(
    answers: Array<{ selectedOption: OptionKey; isCorrect: boolean }>,
    correctOption: OptionKey
  ) {
    const optionCounts: Record<OptionKey, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0
    };

    let correctCount = 0;

    for (const ans of answers) {
      if (optionCounts[ans.selectedOption] !== undefined) {
        optionCounts[ans.selectedOption]++;
      }
      if (ans.isCorrect || ans.selectedOption === correctOption) {
        correctCount++;
      }
    }

    return {
      totalAnswers: answers.length,
      optionCounts,
      correctCount
    };
  }
}
