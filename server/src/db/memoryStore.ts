import { v4 as uuidv4 } from 'uuid';
import { IDatabase } from './types';
import { Quiz, Question, QuizSession, Participant, Answer, LeaderboardEntry, SessionStatus } from '@quizx/shared';
import { DEMO_QUIZ } from './seedData';

export class MemoryDatabase implements IDatabase {
  private quizzes: Map<string, Quiz> = new Map();
  private questions: Map<string, Question[]> = new Map();
  private sessions: Map<string, QuizSession> = new Map();
  private sessionsByRoom: Map<string, string> = new Map(); // room_code -> session_id
  private participants: Map<string, Participant> = new Map();
  private participantScores: Map<string, { score: number; lastScoredAt: number }> = new Map();
  private answers: Map<string, Answer> = new Map(); // key: `${sessionId}:${participantId}:${questionId}`

  constructor() {
    this.seed();
  }

  private seed() {
    this.quizzes.set(DEMO_QUIZ.id!, { ...DEMO_QUIZ });
    if (DEMO_QUIZ.questions) {
      this.questions.set(DEMO_QUIZ.id!, [...DEMO_QUIZ.questions]);
    }
  }

  async getQuizzes(): Promise<Quiz[]> {
    return Array.from(this.quizzes.values()).map(q => ({
      ...q,
      questions: this.questions.get(q.id!) || []
    }));
  }

  async getQuizById(id: string): Promise<Quiz | null> {
    const quiz = this.quizzes.get(id);
    if (!quiz) return null;
    return {
      ...quiz,
      questions: this.questions.get(id) || []
    };
  }

  async saveQuiz(quiz: Quiz): Promise<Quiz> {
    const id = quiz.id || uuidv4();
    const now = new Date().toISOString();
    const savedQuiz: Quiz = {
      ...quiz,
      id,
      created_at: quiz.created_at || now,
      updated_at: now
    };
    this.quizzes.set(id, savedQuiz);

    if (quiz.questions) {
      const qs = quiz.questions.map((q, idx) => ({
        ...q,
        id: q.id || uuidv4(),
        quiz_id: id,
        question_order: q.question_order || idx + 1
      }));
      this.questions.set(id, qs);
      savedQuiz.questions = qs;
    }

    return savedQuiz;
  }

  async deleteQuiz(id: string): Promise<boolean> {
    this.quizzes.delete(id);
    this.questions.delete(id);
    return true;
  }

  async createSession(quizId: string, roomCode: string): Promise<QuizSession> {
    const id = uuidv4();
    const session: QuizSession = {
      id,
      quiz_id: quizId,
      room_code: roomCode.toUpperCase(),
      status: 'waiting',
      current_question_order: 0,
      started_at: null,
      ended_at: null,
      created_at: new Date().toISOString()
    };
    this.sessions.set(id, session);
    this.sessionsByRoom.set(roomCode.toUpperCase(), id);
    return session;
  }

  async getSessionByRoomCode(roomCode: string): Promise<QuizSession | null> {
    const id = this.sessionsByRoom.get(roomCode.toUpperCase());
    if (!id) return null;
    return this.sessions.get(id) || null;
  }

  async getSessionById(id: string): Promise<QuizSession | null> {
    return this.sessions.get(id) || null;
  }

  async updateSession(
    sessionId: string,
    updates: {
      status?: SessionStatus;
      current_question_order?: number;
      started_at?: string;
      ended_at?: string;
    }
  ): Promise<QuizSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const updated: QuizSession = {
      ...session,
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.current_question_order !== undefined && { current_question_order: updates.current_question_order }),
      ...(updates.started_at !== undefined && { started_at: updates.started_at }),
      ...(updates.ended_at !== undefined && { ended_at: updates.ended_at })
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  async addParticipant(sessionId: string, displayName: string, studentIdentifier?: string): Promise<Participant> {
    // Check if participant already exists with same display name in session
    for (const p of this.participants.values()) {
      if (p.session_id === sessionId && p.display_name.toLowerCase() === displayName.toLowerCase()) {
        p.last_seen_at = new Date().toISOString();
        return p;
      }
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const participant: Participant = {
      id,
      session_id: sessionId,
      display_name: displayName,
      student_identifier: studentIdentifier || null,
      total_score: 0,
      is_connected: true,
      joined_at: now,
      last_seen_at: now
    };
    this.participants.set(id, participant);
    this.participantScores.set(id, { score: 0, lastScoredAt: Date.now() });
    return participant;
  }

  async getParticipantById(participantId: string): Promise<Participant | null> {
    return this.participants.get(participantId) || null;
  }

  async getParticipantsForSession(sessionId: string): Promise<Participant[]> {
    return Array.from(this.participants.values()).filter(p => p.session_id === sessionId);
  }

  async updateParticipantScore(participantId: string, scoreToAdd: number): Promise<number> {
    const participant = this.participants.get(participantId);
    if (!participant) return 0;
    participant.total_score += scoreToAdd;
    participant.last_seen_at = new Date().toISOString();
    this.participantScores.set(participantId, {
      score: participant.total_score,
      lastScoredAt: Date.now()
    });
    return participant.total_score;
  }

  async updateParticipantLastSeen(participantId: string): Promise<void> {
    const participant = this.participants.get(participantId);
    if (participant) {
      participant.last_seen_at = new Date().toISOString();
    }
  }

  async recordAnswer(answer: Answer): Promise<{ success: boolean; answer?: Answer; error?: string }> {
    const key = `${answer.session_id}:${answer.participant_id}:${answer.question_id}`;
    if (this.answers.has(key)) {
      return { success: false, error: 'Answer already submitted for this question' };
    }

    const recorded: Answer = {
      ...answer,
      id: answer.id || uuidv4(),
      submitted_at: answer.submitted_at || new Date().toISOString()
    };
    this.answers.set(key, recorded);

    return { success: true, answer: recorded };
  }

  async getAnswersForSession(sessionId: string): Promise<Answer[]> {
    return Array.from(this.answers.values()).filter(a => a.session_id === sessionId);
  }

  async getLeaderboard(sessionId: string): Promise<LeaderboardEntry[]> {
    const sessionParticipants = Array.from(this.participants.values())
      .filter(p => p.session_id === sessionId);

    // Sort by:
    // 1. Score DESC
    // 2. Earliest timestamp achieving that score (deterministic tie-breaker)
    // 3. Joined at ASC
    sessionParticipants.sort((a, b) => {
      if (b.total_score !== a.total_score) {
        return b.total_score - a.total_score;
      }
      const scoreMetaA = this.participantScores.get(a.id)?.lastScoredAt || 0;
      const scoreMetaB = this.participantScores.get(b.id)?.lastScoredAt || 0;
      if (scoreMetaA !== scoreMetaB) {
        return scoreMetaA - scoreMetaB;
      }
      return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
    });

    return sessionParticipants.map((p, index) => ({
      participant_id: p.id,
      display_name: p.display_name,
      student_identifier: p.student_identifier || undefined,
      score: p.total_score,
      rank: index + 1,
      is_connected: p.is_connected
    }));
  }
}
