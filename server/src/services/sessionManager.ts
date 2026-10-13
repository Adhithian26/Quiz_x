import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  Quiz,
  Question,
  QuizSession,
  Participant,
  Answer,
  LeaderboardEntry,
  SessionStatus,
  OptionKey,
  PublicQuestion,
  QuestionStats,
  SessionCountsPayload
} from '@quizx/shared';
import { IDatabase } from '../db/types';
import { ScoringService } from './scoringService';

export interface ParticipantSessionState {
  id: string;
  socketId: string;
  displayName: string;
  studentIdentifier?: string;
  totalScore: number;
  isConnected: boolean;
  joinedAt: string;
  lastSeenAt: string;
}

export interface ActiveRoomState {
  sessionId: string;
  roomCode: string;
  quiz: Quiz;
  status: SessionStatus;
  currentQuestionIndex: number; // 0-based
  currentQuestion: Question | null;
  questionDeadline: number | null; // ms timestamp
  participants: Map<string, ParticipantSessionState>; // participantId -> state
  socketToParticipantId: Map<string, string>; // socketId -> participantId
  currentQuestionAnswers: Map<string, {
    selectedOption: OptionKey;
    isCorrect: boolean;
    pointsAwarded: number;
    submittedAt: number;
  }>; // participantId -> answer
  hostSocketId?: string;
  timerHandle?: NodeJS.Timeout | null;
}

export class SessionManager extends EventEmitter {
  private db: IDatabase;
  private activeRooms: Map<string, ActiveRoomState> = new Map(); // roomCode -> state
  private roomBySessionId: Map<string, string> = new Map(); // sessionId -> roomCode

  constructor(db: IDatabase) {
    super();
    this.db = db;
  }

  /**
   * Generates a clean 6-character room code (no confusing characters like 0/O/1/I)
   */
  public generateRoomCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Creates a new session for a quiz.
   */
  async createSession(quizId: string, hostSocketId?: string): Promise<{ session: QuizSession; roomCode: string }> {
    const quiz = await this.db.getQuizById(quizId);
    if (!quiz) {
      throw new Error(`Quiz not found with id: ${quizId}`);
    }

    if (!quiz.questions || quiz.questions.length === 0) {
      throw new Error('Cannot start session for quiz with no questions');
    }

    // Ensure unique room code
    let roomCode = this.generateRoomCode();
    let attempts = 0;
    while (this.activeRooms.has(roomCode) && attempts < 10) {
      roomCode = this.generateRoomCode();
      attempts++;
    }

    const session = await this.db.createSession(quizId, roomCode);

    const roomState: ActiveRoomState = {
      sessionId: session.id,
      roomCode,
      quiz,
      status: 'waiting',
      currentQuestionIndex: -1,
      currentQuestion: null,
      questionDeadline: null,
      participants: new Map(),
      socketToParticipantId: new Map(),
      currentQuestionAnswers: new Map(),
      hostSocketId,
      timerHandle: null
    };

    this.activeRooms.set(roomCode, roomState);
    this.roomBySessionId.set(session.id, roomCode);

    return { session, roomCode };
  }

  /**
   * Gets an active room by code.
   */
  getRoom(roomCode: string): ActiveRoomState | undefined {
    return this.activeRooms.get(roomCode.toUpperCase());
  }

  /**
   * Student joins or rejoins room.
   */
  async joinParticipant(
    roomCode: string,
    displayName: string,
    studentIdentifier: string | undefined,
    socketId: string,
    existingParticipantId?: string
  ): Promise<{ participant: ParticipantSessionState; isNew: boolean; room: ActiveRoomState }> {
    const room = this.getRoom(roomCode);
    if (!room) {
      throw new Error('Room not found or session ended');
    }

    let participantState: ParticipantSessionState | undefined;
    let isNew = false;

    // Check if participant is reconnecting with ID
    if (existingParticipantId && room.participants.has(existingParticipantId)) {
      participantState = room.participants.get(existingParticipantId)!;
      // Re-map socket
      room.socketToParticipantId.delete(participantState.socketId);
      participantState.socketId = socketId;
      participantState.isConnected = true;
      participantState.lastSeenAt = new Date().toISOString();
      room.socketToParticipantId.set(socketId, existingParticipantId);
    } else {
      // Check if display name is already used in this session
      for (const p of room.participants.values()) {
        if (p.displayName.trim().toLowerCase() === displayName.trim().toLowerCase()) {
          // Re-attach existing participant with matching display name
          room.socketToParticipantId.delete(p.socketId);
          p.socketId = socketId;
          p.isConnected = true;
          p.lastSeenAt = new Date().toISOString();
          room.socketToParticipantId.set(socketId, p.id);
          participantState = p;
          break;
        }
      }
    }

    if (!participantState) {
      // New participant
      const dbParticipant = await this.db.addParticipant(room.sessionId, displayName, studentIdentifier);
      participantState = {
        id: dbParticipant.id,
        socketId,
        displayName: dbParticipant.display_name,
        studentIdentifier: dbParticipant.student_identifier || undefined,
        totalScore: dbParticipant.total_score,
        isConnected: true,
        joinedAt: dbParticipant.joined_at,
        lastSeenAt: dbParticipant.last_seen_at
      };
      room.participants.set(participantState.id, participantState);
      room.socketToParticipantId.set(socketId, participantState.id);
      isNew = true;
    }

    return { participant: participantState, isNew, room };
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnect(socketId: string): { roomCode?: string; participantId?: string } | null {
    for (const [code, room] of this.activeRooms.entries()) {
      if (room.hostSocketId === socketId) {
        room.hostSocketId = undefined;
        return { roomCode: code };
      }

      const participantId = room.socketToParticipantId.get(socketId);
      if (participantId) {
        const participant = room.participants.get(participantId);
        if (participant) {
          participant.isConnected = false;
          participant.lastSeenAt = new Date().toISOString();
        }
        room.socketToParticipantId.delete(socketId);
        return { roomCode: code, participantId };
      }
    }
    return null;
  }

  /**
   * Starts a question for the room.
   */
  async startQuestion(
    roomCode: string,
    questionIndex?: number
  ): Promise<{ publicQuestion: PublicQuestion; deadline: number; room: ActiveRoomState }> {
    const room = this.getRoom(roomCode);
    if (!room) throw new Error('Room not found');

    const questions = room.quiz.questions || [];
    if (questions.length === 0) throw new Error('No questions in quiz');

    // If question index is not passed, advance to next
    const targetIndex = questionIndex !== undefined ? questionIndex : room.currentQuestionIndex + 1;
    if (targetIndex >= questions.length) {
      throw new Error('All questions have been completed');
    }

    // Clear previous timer
    if (room.timerHandle) {
      clearTimeout(room.timerHandle);
      room.timerHandle = null;
    }

    const currentQuestion = questions[targetIndex];
    room.currentQuestionIndex = targetIndex;
    room.currentQuestion = currentQuestion;
    room.status = 'question_active';
    room.currentQuestionAnswers.clear();

    const deadline = Date.now() + (currentQuestion.time_limit_seconds * 1000);
    room.questionDeadline = deadline;

    // Persist session progress
    await this.db.updateSession(room.sessionId, {
      status: 'question_active',
      current_question_order: currentQuestion.question_order,
      started_at: room.currentQuestionIndex === 0 ? new Date().toISOString() : undefined
    });

    // Schedule authoritative server-side timer completion
    room.timerHandle = setTimeout(() => {
      this.closeQuestion(roomCode).catch(err => {
        console.error('[SessionManager] Timer close error:', err);
      });
    }, currentQuestion.time_limit_seconds * 1000);

    const publicQuestion: PublicQuestion = {
      id: currentQuestion.id!,
      question_text: currentQuestion.question_text,
      options: currentQuestion.options,
      points: currentQuestion.points,
      time_limit_seconds: currentQuestion.time_limit_seconds,
      question_order: currentQuestion.question_order,
      total_questions: questions.length,
      deadline_timestamp: deadline
    };

    return { publicQuestion, deadline, room };
  }

  /**
   * Submit an answer from a participant.
   */
  async submitAnswer(
    roomCode: string,
    participantId: string,
    questionId: string,
    selectedOption: OptionKey
  ): Promise<{ accepted: boolean; message: string; pointsAwarded?: number }> {
    const room = this.getRoom(roomCode);
    if (!room) {
      return { accepted: false, message: 'Quiz room not found' };
    }

    if (room.status !== 'question_active' || !room.currentQuestion) {
      return { accepted: false, message: 'Question is not currently active' };
    }

    if (room.currentQuestion.id !== questionId) {
      return { accepted: false, message: 'Question mismatch' };
    }

    // Check server deadline with small 500ms network grace period
    const now = Date.now();
    if (room.questionDeadline && now > room.questionDeadline + 500) {
      return { accepted: false, message: 'Time limit expired' };
    }

    const participant = room.participants.get(participantId);
    if (!participant) {
      return { accepted: false, message: 'Participant not recognized' };
    }

    // Prevent duplicate submission
    if (room.currentQuestionAnswers.has(participantId)) {
      return { accepted: false, message: 'Answer already submitted for this question' };
    }

    // Calculate score
    const scoreResult = ScoringService.calculateScore(room.currentQuestion, selectedOption);

    // Save in memory
    room.currentQuestionAnswers.set(participantId, {
      selectedOption,
      isCorrect: scoreResult.isCorrect,
      pointsAwarded: scoreResult.pointsAwarded,
      submittedAt: now
    });

    // Update participant total score in memory
    participant.totalScore += scoreResult.pointsAwarded;
    participant.lastSeenAt = new Date().toISOString();

    // Async persist to database (non-blocking for high concurrency)
    Promise.all([
      this.db.recordAnswer({
        session_id: room.sessionId,
        participant_id: participantId,
        question_id: questionId,
        selected_option: selectedOption,
        is_correct: scoreResult.isCorrect,
        points_awarded: scoreResult.pointsAwarded,
        submitted_at: new Date(now).toISOString()
      }),
      this.db.updateParticipantScore(participantId, scoreResult.pointsAwarded)
    ]).catch(err => {
      console.error('[SessionManager] DB persist error for answer:', err);
    });

    this.emit('answer:submitted', {
      roomCode,
      counts: this.getCounts(roomCode)
    });

    return {
      accepted: true,
      message: 'Answer recorded successfully',
      pointsAwarded: scoreResult.pointsAwarded
    };
  }

  /**
   * Closes the active question.
   */
  async closeQuestion(roomCode: string): Promise<{ room: ActiveRoomState }> {
    const room = this.getRoom(roomCode);
    if (!room) throw new Error('Room not found');

    if (room.timerHandle) {
      clearTimeout(room.timerHandle);
      room.timerHandle = null;
    }

    room.status = 'question_closed';
    room.questionDeadline = null;

    await this.db.updateSession(room.sessionId, {
      status: 'question_closed'
    });

    this.emit('question:closed', { roomCode });
    return { room };
  }

  /**
   * Reveals correct answer and explanations.
   */
  async revealAnswer(roomCode: string): Promise<{
    room: ActiveRoomState;
    correctOption: OptionKey;
    explanation: string;
    stats: QuestionStats;
  }> {
    const room = this.getRoom(roomCode);
    if (!room) throw new Error('Room not found');
    if (!room.currentQuestion) throw new Error('No active question to reveal');

    room.status = 'question_revealed';

    const answersList = Array.from(room.currentQuestionAnswers.values());
    const stats = ScoringService.calculateQuestionStats(
      answersList,
      room.currentQuestion.correct_option
    );

    await this.db.updateSession(room.sessionId, {
      status: 'question_revealed'
    });

    return {
      room,
      correctOption: room.currentQuestion.correct_option,
      explanation: room.currentQuestion.explanation || '',
      stats
    };
  }

  /**
   * Shows leaderboard.
   */
  async showLeaderboard(roomCode: string): Promise<{ leaderboard: LeaderboardEntry[] }> {
    const room = this.getRoom(roomCode);
    if (!room) throw new Error('Room not found');

    room.status = 'leaderboard';
    await this.db.updateSession(room.sessionId, {
      status: 'leaderboard'
    });

    const leaderboard = await this.getLeaderboard(roomCode);
    return { leaderboard };
  }

  /**
   * Gets ranked leaderboard for a room.
   */
  async getLeaderboard(roomCode: string): Promise<LeaderboardEntry[]> {
    const room = this.getRoom(roomCode);
    if (!room) return [];

    const participants = Array.from(room.participants.values());
    participants.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });

    return participants.map((p, index) => ({
      participant_id: p.id,
      display_name: p.displayName,
      student_identifier: p.studentIdentifier,
      score: p.totalScore,
      rank: index + 1,
      is_connected: p.isConnected
    }));
  }

  /**
   * Ends quiz session.
   */
  async endSession(roomCode: string): Promise<{
    leaderboard: LeaderboardEntry[];
    podium: LeaderboardEntry[];
    totalQuestions: number;
    totalParticipants: number;
  }> {
    const room = this.getRoom(roomCode);
    if (!room) throw new Error('Room not found');

    if (room.timerHandle) {
      clearTimeout(room.timerHandle);
      room.timerHandle = null;
    }

    room.status = 'finished';
    const endedAt = new Date().toISOString();

    await this.db.updateSession(room.sessionId, {
      status: 'finished',
      ended_at: endedAt
    });

    const leaderboard = await this.getLeaderboard(roomCode);
    const podium = leaderboard.slice(0, 3);

    return {
      leaderboard,
      podium,
      totalQuestions: (room.quiz.questions || []).length,
      totalParticipants: room.participants.size
    };
  }

  /**
   * Gets participant counts for a room.
   */
  getCounts(roomCode: string): SessionCountsPayload {
    const room = this.getRoom(roomCode);
    if (!room) return { joinedCount: 0, connectedCount: 0, submittedCount: 0 };

    let connectedCount = 0;
    for (const p of room.participants.values()) {
      if (p.isConnected) connectedCount++;
    }

    return {
      joinedCount: room.participants.size,
      connectedCount,
      submittedCount: room.currentQuestionAnswers.size
    };
  }

  /**
   * Export participant results and answers as CSV string.
   */
  async exportCsv(sessionId: string): Promise<string> {
    const participants = await this.db.getParticipantsForSession(sessionId);
    const answers = await this.db.getAnswersForSession(sessionId);
    const leaderboard = await this.db.getLeaderboard(sessionId);

    // Build header
    const headers = ['Rank', 'Display Name', 'Student Identifier', 'Total Score', 'Joined At'];
    const rows: string[] = [headers.join(',')];

    for (const entry of leaderboard) {
      const p = participants.find(x => x.id === entry.participant_id);
      const row = [
        entry.rank,
        `"${entry.display_name.replace(/"/g, '""')}"`,
        `"${(entry.student_identifier || '').replace(/"/g, '""')}"`,
        entry.score,
        p ? p.joined_at : ''
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }
}
