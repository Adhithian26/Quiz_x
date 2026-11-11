import { MongoClient, Db } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { IDatabase } from './types';
import { Quiz, QuizSession, Participant, Answer, LeaderboardEntry, SessionStatus } from '@quizx/shared';
import { DEMO_QUIZ } from './seedData';

export class MongoDatabase implements IDatabase {
  private client: MongoClient;
  private db!: Db;
  private initPromise: Promise<void>;

  constructor(mongoUri: string, dbName: string = 'quizx') {
    this.client = new MongoClient(mongoUri);
    // If database name is specified in URI path, mongodb driver uses it; otherwise fallback to dbName
    this.db = this.client.db(dbName);
    this.initPromise = this.init();
  }

  private async init(): Promise<void> {
    try {
      await this.client.connect();
      console.log(`[MongoDB] Connected successfully to cluster (Database: ${this.db.databaseName})`);

      // Ensure necessary indexes
      const quizzesCol = this.db.collection('quizzes');
      const sessionsCol = this.db.collection('quiz_sessions');
      const participantsCol = this.db.collection('participants');
      const answersCol = this.db.collection('answers');

      await Promise.all([
        quizzesCol.createIndex({ id: 1 }, { unique: true }),
        sessionsCol.createIndex({ id: 1 }, { unique: true }),
        sessionsCol.createIndex({ room_code: 1 }),
        participantsCol.createIndex({ id: 1 }, { unique: true }),
        participantsCol.createIndex({ session_id: 1 }),
        answersCol.createIndex({ session_id: 1, participant_id: 1, question_id: 1 }, { unique: true })
      ]);

      // Auto-seed DEMO_QUIZ if database has no quizzes
      const quizCount = await quizzesCol.countDocuments();
      if (quizCount === 0) {
        console.log('[MongoDB] Empty quizzes collection detected. Auto-seeding AI Challenge Arena demo quiz...');
        await this.internalSaveQuiz(DEMO_QUIZ);
        console.log('[MongoDB] Demo quiz seeded successfully.');
      }
    } catch (error) {
      console.error('[MongoDB] Initialization error:', error);
    }
  }

  private async ensureInitialized(): Promise<void> {
    await this.initPromise;
  }

  private async internalSaveQuiz(quiz: Quiz): Promise<Quiz> {
    const quizId = quiz.id || uuidv4();
    const now = new Date().toISOString();

    const formattedQuestions = (quiz.questions || []).map((q, idx) => ({
      ...q,
      id: q.id || uuidv4(),
      quiz_id: quizId,
      question_order: q.question_order || idx + 1
    }));

    const quizPayload = {
      id: quizId,
      title: quiz.title,
      description: quiz.description || '',
      status: quiz.status || 'published',
      questions: formattedQuestions,
      updated_at: now
    };

    await this.db.collection('quizzes').updateOne(
      { id: quizId },
      {
        $set: quizPayload,
        $setOnInsert: {
          created_at: quiz.created_at || now
        }
      },
      { upsert: true }
    );

    const saved = await this.db.collection('quizzes').findOne({ id: quizId }, { projection: { _id: 0 } });
    return saved as unknown as Quiz;
  }

  async getQuizzes(): Promise<Quiz[]> {
    await this.ensureInitialized();
    const quizzes = await this.db
      .collection('quizzes')
      .find({}, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .toArray();

    return quizzes as unknown as Quiz[];
  }

  async getQuizById(id: string): Promise<Quiz | null> {
    await this.ensureInitialized();
    const quiz = await this.db
      .collection('quizzes')
      .findOne({ id }, { projection: { _id: 0 } });

    if (!quiz) return null;
    return quiz as unknown as Quiz;
  }

  async saveQuiz(quiz: Quiz): Promise<Quiz> {
    await this.ensureInitialized();
    return this.internalSaveQuiz(quiz);
  }

  async deleteQuiz(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const res = await this.db.collection('quizzes').deleteOne({ id });
    return res.deletedCount > 0;
  }

  async createSession(quizId: string, roomCode: string): Promise<QuizSession> {
    await this.ensureInitialized();
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

    await this.db.collection('quiz_sessions').insertOne({ ...session });
    return session;
  }

  async getSessionByRoomCode(roomCode: string): Promise<QuizSession | null> {
    await this.ensureInitialized();
    const session = await this.db
      .collection('quiz_sessions')
      .findOne({ room_code: roomCode.toUpperCase() }, { projection: { _id: 0 } });

    if (!session) return null;
    return session as unknown as QuizSession;
  }

  async getSessionById(id: string): Promise<QuizSession | null> {
    await this.ensureInitialized();
    const session = await this.db
      .collection('quiz_sessions')
      .findOne({ id }, { projection: { _id: 0 } });

    if (!session) return null;
    return session as unknown as QuizSession;
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
    await this.ensureInitialized();
    const res = await this.db.collection('quiz_sessions').findOneAndUpdate(
      { id: sessionId },
      { $set: updates },
      { returnDocument: 'after', projection: { _id: 0 } }
    );

    if (!res) return null;
    return res as unknown as QuizSession;
  }

  async addParticipant(sessionId: string, displayName: string, studentIdentifier?: string): Promise<Participant> {
    await this.ensureInitialized();
    const escapedName = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await this.db.collection('participants').findOne(
      {
        session_id: sessionId,
        display_name: { $regex: new RegExp(`^${escapedName}$`, 'i') }
      },
      { projection: { _id: 0 } }
    );

    const now = new Date().toISOString();
    if (existing) {
      await this.db.collection('participants').updateOne(
        { id: existing.id },
        { $set: { last_seen_at: now, is_connected: true } }
      );
      return {
        ...(existing as unknown as Participant),
        last_seen_at: now,
        is_connected: true
      };
    }

    const id = uuidv4();
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

    await this.db.collection('participants').insertOne({
      ...participant,
      last_scored_at: Date.now()
    });

    return participant;
  }

  async getParticipantById(participantId: string): Promise<Participant | null> {
    await this.ensureInitialized();
    const participant = await this.db
      .collection('participants')
      .findOne({ id: participantId }, { projection: { _id: 0 } });

    if (!participant) return null;
    return participant as unknown as Participant;
  }

  async getParticipantsForSession(sessionId: string): Promise<Participant[]> {
    await this.ensureInitialized();
    const participants = await this.db
      .collection('participants')
      .find({ session_id: sessionId }, { projection: { _id: 0 } })
      .sort({ total_score: -1 })
      .toArray();

    return participants as unknown as Participant[];
  }

  async updateParticipantScore(participantId: string, scoreToAdd: number): Promise<number> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    const res = await this.db.collection('participants').findOneAndUpdate(
      { id: participantId },
      {
        $inc: { total_score: scoreToAdd },
        $set: { last_seen_at: now, last_scored_at: Date.now() }
      },
      { returnDocument: 'after', projection: { _id: 0 } }
    );

    return (res as any)?.total_score || 0;
  }

  async updateParticipantLastSeen(participantId: string): Promise<void> {
    await this.ensureInitialized();
    await this.db.collection('participants').updateOne(
      { id: participantId },
      { $set: { last_seen_at: new Date().toISOString() } }
    );
  }

  async recordAnswer(answer: Answer): Promise<{ success: boolean; answer?: Answer; error?: string }> {
    await this.ensureInitialized();
    const recorded: Answer = {
      ...answer,
      id: answer.id || uuidv4(),
      submitted_at: answer.submitted_at || new Date().toISOString()
    };

    try {
      await this.db.collection('answers').insertOne({ ...recorded });
      return { success: true, answer: recorded };
    } catch (err: any) {
      if (err.code === 11000) {
        return { success: false, error: 'Answer already submitted for this question' };
      }
      return { success: false, error: err.message || 'Failed to record answer' };
    }
  }

  async getAnswersForSession(sessionId: string): Promise<Answer[]> {
    await this.ensureInitialized();
    const answers = await this.db
      .collection('answers')
      .find({ session_id: sessionId }, { projection: { _id: 0 } })
      .toArray();

    return answers as unknown as Answer[];
  }

  async getLeaderboard(sessionId: string): Promise<LeaderboardEntry[]> {
    await this.ensureInitialized();
    const participants = await this.db
      .collection('participants')
      .find({ session_id: sessionId }, { projection: { _id: 0 } })
      .sort({ total_score: -1, last_scored_at: 1, joined_at: 1 })
      .toArray();

    return participants.map((p: any, index: number) => ({
      participant_id: p.id,
      display_name: p.display_name,
      student_identifier: p.student_identifier || undefined,
      score: p.total_score,
      rank: index + 1,
      is_connected: p.is_connected
    }));
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
