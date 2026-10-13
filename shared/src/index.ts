import { z } from 'zod';

// ==========================================
// DATA MODELS & SCHEMAS
// ==========================================

export const OptionKeySchema = z.enum(['A', 'B', 'C', 'D']);
export type OptionKey = z.infer<typeof OptionKeySchema>;

export const QuestionOptionSchema = z.object({
  key: OptionKeySchema,
  text: z.string().min(1, 'Option text is required')
});
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;

export const QuestionSchema = z.object({
  id: z.string().uuid().optional(),
  quiz_id: z.string().uuid().optional(),
  question_text: z.string().min(3, 'Question text must be at least 3 characters'),
  options: z.array(QuestionOptionSchema).length(4, 'Exactly 4 options are required'),
  correct_option: OptionKeySchema,
  points: z.number().int().min(1).max(1000).default(100),
  time_limit_seconds: z.number().int().min(5).max(120).default(30),
  question_order: z.number().int().min(1),
  explanation: z.string().optional().default(''),
  created_at: z.string().optional()
});
export type Question = z.infer<typeof QuestionSchema>;

// Public view of question sent to student/projector before reveal (No correct answer/explanation)
export interface PublicQuestion {
  id: string;
  question_text: string;
  options: QuestionOption[];
  points: number;
  time_limit_seconds: number;
  question_order: number;
  total_questions: number;
  deadline_timestamp: number; // Server-authoritative Unix timestamp in ms
}

export const QuizSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3, 'Quiz title must be at least 3 characters'),
  description: z.string().optional().default(''),
  status: z.enum(['draft', 'published']).default('published'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  questions: z.array(QuestionSchema).optional()
});
export type Quiz = z.infer<typeof QuizSchema>;

export type SessionStatus = 
  | 'waiting'
  | 'question_active'
  | 'question_closed'
  | 'question_revealed'
  | 'leaderboard'
  | 'finished';

export interface QuizSession {
  id: string;
  quiz_id: string;
  room_code: string;
  status: SessionStatus;
  current_question_order: number;
  started_at?: string | null;
  ended_at?: string | null;
  created_at: string;
}

export interface Participant {
  id: string;
  session_id: string;
  display_name: string;
  student_identifier?: string | null;
  total_score: number;
  is_connected?: boolean;
  joined_at: string;
  last_seen_at: string;
}

export interface Answer {
  id?: string;
  session_id: string;
  participant_id: string;
  question_id: string;
  selected_option: OptionKey;
  is_correct: boolean;
  points_awarded: number;
  submitted_at: string;
  response_time_ms?: number;
}

export interface LeaderboardEntry {
  participant_id: string;
  display_name: string;
  student_identifier?: string;
  score: number;
  rank: number;
  last_scored_at?: string;
  is_connected?: boolean;
}

export interface QuestionStats {
  totalAnswers: number;
  optionCounts: Record<OptionKey, number>;
  correctCount: number;
}

// ==========================================
// SOCKET PAYLOADS & VALIDATION SCHEMAS
// ==========================================

export const StudentJoinPayloadSchema = z.object({
  roomCode: z.string().trim().min(4).max(8).toUpperCase(),
  displayName: z.string().trim().min(2, 'Name must be at least 2 characters').max(30),
  studentIdentifier: z.string().trim().max(30).optional(),
  participantId: z.string().uuid().optional() // For reconnecting
});
export type StudentJoinPayload = z.infer<typeof StudentJoinPayloadSchema>;

export const StudentSubmitAnswerPayloadSchema = z.object({
  roomCode: z.string().trim().toUpperCase(),
  participantId: z.string().uuid(),
  questionId: z.string().uuid(),
  selectedOption: OptionKeySchema,
  submittedAt: z.number().optional() // Client timestamp, server uses authoritative time
});
export type StudentSubmitAnswerPayload = z.infer<typeof StudentSubmitAnswerPayloadSchema>;

export const StudentReconnectPayloadSchema = z.object({
  roomCode: z.string().trim().toUpperCase(),
  participantId: z.string().uuid()
});
export type StudentReconnectPayload = z.infer<typeof StudentReconnectPayloadSchema>;

export const HostAuthPayloadSchema = z.object({
  hostSecret: z.string().min(1)
});
export type HostAuthPayload = z.infer<typeof HostAuthPayloadSchema>;

export const HostRoomActionPayloadSchema = z.object({
  roomCode: z.string().trim().toUpperCase()
});
export type HostRoomActionPayload = z.infer<typeof HostRoomActionPayloadSchema>;

// Server to Client Payloads
export interface SessionCountsPayload {
  joinedCount: number;
  connectedCount: number;
  submittedCount: number;
}

export interface AnswerAckPayload {
  accepted: boolean;
  message: string;
  selectedOption?: OptionKey;
  questionId?: string;
}

export interface QuestionRevealedPayload {
  questionId: string;
  correctOption: OptionKey;
  explanation: string;
  stats: QuestionStats;
}

export interface StudentStateRestoredPayload {
  sessionStatus: SessionStatus;
  currentQuestion?: PublicQuestion | null;
  hasSubmittedCurrentQuestion: boolean;
  selectedOption?: OptionKey | null;
  totalScore: number;
  currentRank?: number;
  participantId: string;
  displayName: string;
  revealedResult?: {
    correctOption: OptionKey;
    explanation: string;
    isCorrect: boolean;
    pointsEarned: number;
  } | null;
}

export interface SessionFinishedPayload {
  leaderboard: LeaderboardEntry[];
  podium: LeaderboardEntry[];
  totalQuestions: number;
  totalParticipants: number;
}
