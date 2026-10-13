import { Quiz, Question, QuizSession, Participant, Answer, LeaderboardEntry, SessionStatus } from '@quizx/shared';

export interface IDatabase {
  // Quizzes & Questions
  getQuizzes(): Promise<Quiz[]>;
  getQuizById(id: string): Promise<Quiz | null>;
  saveQuiz(quiz: Quiz): Promise<Quiz>;
  deleteQuiz(id: string): Promise<boolean>;

  // Sessions
  createSession(quizId: string, roomCode: string): Promise<QuizSession>;
  getSessionByRoomCode(roomCode: string): Promise<QuizSession | null>;
  getSessionById(id: string): Promise<QuizSession | null>;
  updateSession(
    sessionId: string,
    updates: {
      status?: SessionStatus;
      current_question_order?: number;
      started_at?: string;
      ended_at?: string;
    }
  ): Promise<QuizSession | null>;

  // Participants
  addParticipant(sessionId: string, displayName: string, studentIdentifier?: string): Promise<Participant>;
  getParticipantById(participantId: string): Promise<Participant | null>;
  getParticipantsForSession(sessionId: string): Promise<Participant[]>;
  updateParticipantScore(participantId: string, scoreToAdd: number): Promise<number>;
  updateParticipantLastSeen(participantId: string): Promise<void>;

  // Answers
  recordAnswer(answer: Answer): Promise<{ success: boolean; answer?: Answer; error?: string }>;
  getAnswersForSession(sessionId: string): Promise<Answer[]>;

  // Leaderboard
  getLeaderboard(sessionId: string): Promise<LeaderboardEntry[]>;
}
