import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IDatabase } from './types';
import { Quiz, Question, QuizSession, Participant, Answer, LeaderboardEntry, SessionStatus } from '@quizx/shared';

export class SupabaseDatabase implements IDatabase {
  private client: SupabaseClient;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  async getQuizzes(): Promise<Quiz[]> {
    const { data: quizzes, error } = await this.client
      .from('quizzes')
      .select('*, questions(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Error fetching quizzes:', error);
      throw new Error(`Failed to fetch quizzes: ${error.message}`);
    }

    return (quizzes || []).map((q: any) => ({
      ...q,
      questions: (q.questions || []).sort((a: any, b: any) => a.question_order - b.question_order)
    }));
  }

  async getQuizById(id: string): Promise<Quiz | null> {
    const { data: quiz, error } = await this.client
      .from('quizzes')
      .select('*, questions(*)')
      .eq('id', id)
      .single();

    if (error || !quiz) {
      return null;
    }

    return {
      ...quiz,
      questions: (quiz.questions || []).sort((a: any, b: any) => a.question_order - b.question_order)
    };
  }

  async saveQuiz(quiz: Quiz): Promise<Quiz> {
    const quizPayload = {
      title: quiz.title,
      description: quiz.description || '',
      status: quiz.status || 'published',
      updated_at: new Date().toISOString()
    };

    let quizId = quiz.id;

    if (quizId) {
      const { error } = await this.client
        .from('quizzes')
        .update(quizPayload)
        .eq('id', quizId);

      if (error) throw new Error(`Failed to update quiz: ${error.message}`);
    } else {
      const { data, error } = await this.client
        .from('quizzes')
        .insert({ ...quizPayload, created_at: new Date().toISOString() })
        .select()
        .single();

      if (error) throw new Error(`Failed to create quiz: ${error.message}`);
      quizId = data.id;
    }

    // Replace questions if provided
    if (quiz.questions && quiz.questions.length > 0) {
      await this.client.from('questions').delete().eq('quiz_id', quizId);

      const questionsToInsert = quiz.questions.map((q, idx) => ({
        quiz_id: quizId,
        question_text: q.question_text,
        options: q.options,
        correct_option: q.correct_option,
        points: q.points,
        time_limit_seconds: q.time_limit_seconds,
        question_order: q.question_order || idx + 1,
        explanation: q.explanation || ''
      }));

      const { error: qError } = await this.client
        .from('questions')
        .insert(questionsToInsert);

      if (qError) throw new Error(`Failed to save questions: ${qError.message}`);
    }

    return this.getQuizById(quizId!) as Promise<Quiz>;
  }

  async deleteQuiz(id: string): Promise<boolean> {
    const { error } = await this.client.from('quizzes').delete().eq('id', id);
    if (error) {
      console.error('[Supabase] Error deleting quiz:', error);
      return false;
    }
    return true;
  }

  async createSession(quizId: string, roomCode: string): Promise<QuizSession> {
    const { data, error } = await this.client
      .from('quiz_sessions')
      .insert({
        quiz_id: quizId,
        room_code: roomCode.toUpperCase(),
        status: 'waiting',
        current_question_order: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create session: ${error.message}`);
    return data;
  }

  async getSessionByRoomCode(roomCode: string): Promise<QuizSession | null> {
    const { data, error } = await this.client
      .from('quiz_sessions')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (error || !data) return null;
    return data;
  }

  async getSessionById(id: string): Promise<QuizSession | null> {
    const { data, error } = await this.client
      .from('quiz_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data;
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
    const { data, error } = await this.client
      .from('quiz_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error updating session:', error);
      return null;
    }
    return data;
  }

  async addParticipant(sessionId: string, displayName: string, studentIdentifier?: string): Promise<Participant> {
    // Check if participant already exists in session
    const { data: existing } = await this.client
      .from('participants')
      .select('*')
      .eq('session_id', sessionId)
      .ilike('display_name', displayName)
      .single();

    if (existing) {
      await this.client
        .from('participants')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', existing.id);
      return existing;
    }

    const { data, error } = await this.client
      .from('participants')
      .insert({
        session_id: sessionId,
        display_name: displayName,
        student_identifier: studentIdentifier || null,
        total_score: 0,
        joined_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add participant: ${error.message}`);
    return data;
  }

  async getParticipantById(participantId: string): Promise<Participant | null> {
    const { data, error } = await this.client
      .from('participants')
      .select('*')
      .eq('id', participantId)
      .single();

    if (error || !data) return null;
    return data;
  }

  async getParticipantsForSession(sessionId: string): Promise<Participant[]> {
    const { data, error } = await this.client
      .from('participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('total_score', { ascending: false });

    if (error) return [];
    return data || [];
  }

  async updateParticipantScore(participantId: string, scoreToAdd: number): Promise<number> {
    // Atomic score increment
    const { data: current } = await this.client
      .from('participants')
      .select('total_score')
      .eq('id', participantId)
      .single();

    const newScore = (current?.total_score || 0) + scoreToAdd;

    await this.client
      .from('participants')
      .update({
        total_score: newScore,
        last_seen_at: new Date().toISOString()
      })
      .eq('id', participantId);

    return newScore;
  }

  async updateParticipantLastSeen(participantId: string): Promise<void> {
    await this.client
      .from('participants')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', participantId);
  }

  async recordAnswer(answer: Answer): Promise<{ success: boolean; answer?: Answer; error?: string }> {
    const { data, error } = await this.client
      .from('answers')
      .insert({
        session_id: answer.session_id,
        participant_id: answer.participant_id,
        question_id: answer.question_id,
        selected_option: answer.selected_option,
        is_correct: answer.is_correct,
        points_awarded: answer.points_awarded,
        submitted_at: answer.submitted_at || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // 23505 is PostgreSQL unique constraint violation
      if (error.code === '23505') {
        return { success: false, error: 'Answer already submitted for this question' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, answer: data };
  }

  async getAnswersForSession(sessionId: string): Promise<Answer[]> {
    const { data, error } = await this.client
      .from('answers')
      .select('*')
      .eq('session_id', sessionId);

    if (error) return [];
    return data || [];
  }

  async getLeaderboard(sessionId: string): Promise<LeaderboardEntry[]> {
    const { data, error } = await this.client
      .from('participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('total_score', { ascending: false })
      .order('joined_at', { ascending: true });

    if (error || !data) return [];

    return data.map((p: any, index: number) => ({
      participant_id: p.id,
      display_name: p.display_name,
      student_identifier: p.student_identifier || undefined,
      score: p.total_score,
      rank: index + 1
    }));
  }
}
