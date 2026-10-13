import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryDatabase } from '../src/db/memoryStore';
import { SessionManager } from '../src/services/sessionManager';
import { ScoringService } from '../src/services/scoringService';
import { DEMO_QUIZ } from '../src/db/seedData';
import { OptionKey } from '@quizx/shared';

describe('QuizX Live — Real-Time Engine & Business Logic Test Suite', () => {
  let db: MemoryDatabase;
  let sessionManager: SessionManager;

  beforeEach(() => {
    db = new MemoryDatabase();
    sessionManager = new SessionManager(db);
  });

  it('1. Quiz creation, validation, and seeded quiz retrieval', async () => {
    const quizzes = await db.getQuizzes();
    expect(quizzes.length).toBeGreaterThanOrEqual(1);

    const demo = quizzes.find(q => q.title === 'AI Challenge Arena');
    expect(demo).toBeDefined();
    expect(demo?.questions?.length).toBe(10);

    // Verify first question structure
    const q1 = demo!.questions![0];
    expect(q1.question_text).toContain('Artificial Intelligence');
    expect(q1.options.length).toBe(4);
    expect(q1.correct_option).toBe('B');
    expect(q1.points).toBe(100);
    expect(q1.time_limit_seconds).toBe(25);
  });

  it('2. Room code generation and collision handling', async () => {
    const code1 = sessionManager.generateRoomCode();
    const code2 = sessionManager.generateRoomCode();
    expect(code1.length).toBe(6);
    expect(code2.length).toBe(6);
    expect(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/.test(code1)).toBe(true);

    const { session, roomCode } = await sessionManager.createSession(DEMO_QUIZ.id!, 'host-socket-1');
    expect(session.room_code).toBe(roomCode);
    expect(sessionManager.getRoom(roomCode)).toBeDefined();
  });

  it('3. Student joining and session tracking', async () => {
    const { roomCode } = await sessionManager.createSession(DEMO_QUIZ.id!, 'host-socket-1');

    const joinResult = await sessionManager.joinParticipant(
      roomCode,
      'Alice Johnson',
      'CS101',
      'socket-alice-1'
    );

    expect(joinResult.isNew).toBe(true);
    expect(joinResult.participant.displayName).toBe('Alice Johnson');
    expect(joinResult.participant.totalScore).toBe(0);

    const counts = sessionManager.getCounts(roomCode);
    expect(counts.joinedCount).toBe(1);
    expect(counts.connectedCount).toBe(1);
    expect(counts.submittedCount).toBe(0);
  });

  it('4. Student reconnection and state restoration', async () => {
    const { roomCode } = await sessionManager.createSession(DEMO_QUIZ.id!, 'host-socket-1');

    const joinResult = await sessionManager.joinParticipant(
      roomCode,
      'Bob Smith',
      'CS102',
      'socket-bob-1'
    );
    const participantId = joinResult.participant.id;

    // Simulate socket disconnect
    sessionManager.handleDisconnect('socket-bob-1');
    const countsAfterDisconnect = sessionManager.getCounts(roomCode);
    expect(countsAfterDisconnect.connectedCount).toBe(0);

    // Reconnect with new socket ID and existing participantId
    const reconnectResult = await sessionManager.joinParticipant(
      roomCode,
      'Bob Smith',
      'CS102',
      'socket-bob-2',
      participantId
    );

    expect(reconnectResult.isNew).toBe(false);
    expect(reconnectResult.participant.id).toBe(participantId);
    expect(reconnectResult.participant.isConnected).toBe(true);
    expect(sessionManager.getCounts(roomCode).connectedCount).toBe(1);
  });

  it('5. Question activation, anti-cheat public payload, and deadline enforcement', async () => {
    const { roomCode } = await sessionManager.createSession(DEMO_QUIZ.id!, 'host-socket-1');

    const { publicQuestion, deadline } = await sessionManager.startQuestion(roomCode, 0);

    // CRITICAL ANTI-CHEAT: Student public question must NEVER contain correct_option or explanation!
    expect((publicQuestion as any).correct_option).toBeUndefined();
    expect((publicQuestion as any).explanation).toBeUndefined();
    expect(publicQuestion.question_text).toBeDefined();
    expect(publicQuestion.options.length).toBe(4);
    expect(deadline).toBeGreaterThan(Date.now());

    const room = sessionManager.getRoom(roomCode)!;
    expect(room.status).toBe('question_active');
  });

  it('6. Authoritative scoring, answer validation, and duplicate submission prevention', async () => {
    const { roomCode } = await sessionManager.createSession(DEMO_QUIZ.id!, 'host-socket-1');
    const { participant } = await sessionManager.joinParticipant(roomCode, 'Charlie', 'CS103', 'socket-charlie');

    const { publicQuestion } = await sessionManager.startQuestion(roomCode, 0); // Question 1: correct is B

    // Submit correct answer
    const submitResult1 = await sessionManager.submitAnswer(
      roomCode,
      participant.id,
      publicQuestion.id,
      'B' as OptionKey
    );

    expect(submitResult1.accepted).toBe(true);
    expect(submitResult1.pointsAwarded).toBe(100);

    // Verify duplicate answer rejected
    const submitResultDuplicate = await sessionManager.submitAnswer(
      roomCode,
      participant.id,
      publicQuestion.id,
      'A' as OptionKey
    );

    expect(submitResultDuplicate.accepted).toBe(false);
    expect(submitResultDuplicate.message).toContain('already submitted');

    // Total score should remain 100, not double counted
    const updatedParticipant = sessionManager.getRoom(roomCode)!.participants.get(participant.id);
    expect(updatedParticipant?.totalScore).toBe(100);
  });

  it('7. Rejection of answers after deadline or when question is closed', async () => {
    const { roomCode } = await sessionManager.createSession(DEMO_QUIZ.id!, 'host-socket-1');
    const { participant } = await sessionManager.joinParticipant(roomCode, 'Dave', 'CS104', 'socket-dave');
    const { publicQuestion } = await sessionManager.startQuestion(roomCode, 0);

    // Close question
    await sessionManager.closeQuestion(roomCode);
    const room = sessionManager.getRoom(roomCode)!;
    expect(room.status).toBe('question_closed');

    // Attempt submission on closed question
    const submitResult = await sessionManager.submitAnswer(
      roomCode,
      participant.id,
      publicQuestion.id,
      'B' as OptionKey
    );

    expect(submitResult.accepted).toBe(false);
    expect(submitResult.message).toContain('not currently active');
  });

  it('8. Question reveal with accurate distribution statistics', async () => {
    const { roomCode } = await sessionManager.createSession(DEMO_QUIZ.id!, 'host-socket-1');

    // Add 3 students
    const s1 = await sessionManager.joinParticipant(roomCode, 'Student 1', 'ID1', 'sock-1');
    const s2 = await sessionManager.joinParticipant(roomCode, 'Student 2', 'ID2', 'sock-2');
    const s3 = await sessionManager.joinParticipant(roomCode, 'Student 3', 'ID3', 'sock-3');

    const { publicQuestion } = await sessionManager.startQuestion(roomCode, 0); // Q1: Correct is B

    await sessionManager.submitAnswer(roomCode, s1.participant.id, publicQuestion.id, 'B'); // correct
    await sessionManager.submitAnswer(roomCode, s2.participant.id, publicQuestion.id, 'B'); // correct
    await sessionManager.submitAnswer(roomCode, s3.participant.id, publicQuestion.id, 'A'); // incorrect

    await sessionManager.closeQuestion(roomCode);
    const reveal = await sessionManager.revealAnswer(roomCode);

    expect(reveal.correctOption).toBe('B');
    expect(reveal.stats.totalAnswers).toBe(3);
    expect(reveal.stats.correctCount).toBe(2);
    expect(reveal.stats.optionCounts.B).toBe(2);
    expect(reveal.stats.optionCounts.A).toBe(1);
    expect(reveal.stats.optionCounts.C).toBe(0);
    expect(reveal.stats.optionCounts.D).toBe(0);
  });

  it('9. Deterministic Leaderboard sorting with tie-breaking', async () => {
    const { roomCode } = await sessionManager.createSession(DEMO_QUIZ.id!, 'host-socket-1');

    const s1 = await sessionManager.joinParticipant(roomCode, 'Eve', 'ID-E', 'sock-e');
    const s2 = await sessionManager.joinParticipant(roomCode, 'Frank', 'ID-F', 'sock-f');
    const s3 = await sessionManager.joinParticipant(roomCode, 'Grace', 'ID-G', 'sock-g');

    // Direct score assignments to test tie-breaking
    s1.participant.totalScore = 200;
    s2.participant.totalScore = 300;
    s3.participant.totalScore = 200; // Tied with Eve

    const leaderboard = await sessionManager.getLeaderboard(roomCode);

    expect(leaderboard[0].display_name).toBe('Frank');
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[0].score).toBe(300);

    // Eve joined before Grace, so Eve wins the tie-breaker
    expect(leaderboard[1].display_name).toBe('Eve');
    expect(leaderboard[1].rank).toBe(2);
    expect(leaderboard[2].display_name).toBe('Grace');
    expect(leaderboard[2].rank).toBe(3);
  });

  it('10. Session completion and podium generation', async () => {
    const { roomCode } = await sessionManager.createSession(DEMO_QUIZ.id!, 'host-socket-1');
    await sessionManager.joinParticipant(roomCode, 'Winner', 'W1', 'sock-w');
    await sessionManager.joinParticipant(roomCode, 'Runner-Up', 'R1', 'sock-r');

    const finished = await sessionManager.endSession(roomCode);
    expect(finished.leaderboard.length).toBe(2);
    expect(finished.podium.length).toBe(2);
    expect(finished.totalQuestions).toBe(10);
  });

  it('11. CSV Export generation with headers and sanitization', async () => {
    const { session, roomCode } = await sessionManager.createSession(DEMO_QUIZ.id!, 'host-socket-1');
    await sessionManager.joinParticipant(roomCode, 'Hannah "Quote" Doe', 'STU99', 'sock-h');

    const csv = await sessionManager.exportCsv(session.id);
    expect(csv).toContain('Rank,Display Name,Student Identifier,Total Score,Joined At');
    expect(csv).toContain('"Hannah ""Quote"" Doe"');
    expect(csv).toContain('"STU99"');
  });
});
