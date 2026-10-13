import { Server as SocketIOServer, Socket } from 'socket.io';
import {
  StudentJoinPayloadSchema,
  StudentSubmitAnswerPayloadSchema,
  StudentReconnectPayloadSchema,
  HostAuthPayloadSchema,
  PublicQuestion,
  LeaderboardEntry,
  SessionCountsPayload
} from '@quizx/shared';
import { SessionManager } from '../services/sessionManager';
import { config } from '../config';

export function setupSocketHandlers(io: SocketIOServer, sessionManager: SessionManager) {
  // Set up listener for internal timer completion
  sessionManager.on('question:closed', ({ roomCode }) => {
    io.to(`room:${roomCode}`).emit('question:closed');
    io.to(`room:${roomCode}`).emit('counts:update', sessionManager.getCounts(roomCode));
  });

  sessionManager.on('answer:submitted', ({ roomCode, counts }) => {
    io.to(`host:${roomCode}`).emit('counts:update', counts);
    io.to(`projector:${roomCode}`).emit('counts:update', counts);
  });

  io.on('connection', (socket: Socket) => {
    let authenticatedHost = false;

    // ==========================================
    // HOST HANDLERS
    // ==========================================
    socket.on('host:auth', (payload: any, callback?: Function) => {
      const parsed = HostAuthPayloadSchema.safeParse(payload);
      if (!parsed.success || parsed.data.hostSecret !== config.hostSecret) {
        if (callback) callback({ success: false, message: 'Invalid host secret' });
        return;
      }
      authenticatedHost = true;
      if (callback) callback({ success: true, message: 'Host authenticated' });
    });

    socket.on('host:create_session', async (payload: { quizId: string }, callback?: Function) => {
      if (!authenticatedHost) {
        if (callback) callback({ success: false, message: 'Unauthorized' });
        return;
      }

      try {
        const { session, roomCode } = await sessionManager.createSession(payload.quizId, socket.id);
        socket.join(`room:${roomCode}`);
        socket.join(`host:${roomCode}`);

        if (callback) {
          callback({
            success: true,
            session,
            roomCode
          });
        }
      } catch (err: any) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('host:join_room', (payload: { roomCode: string }, callback?: Function) => {
      if (!authenticatedHost) {
        if (callback) callback({ success: false, message: 'Unauthorized' });
        return;
      }
      const roomCode = payload.roomCode?.toUpperCase();
      const room = sessionManager.getRoom(roomCode);
      if (!room) {
        if (callback) callback({ success: false, message: 'Room not found' });
        return;
      }
      socket.join(`room:${roomCode}`);
      socket.join(`host:${roomCode}`);
      room.hostSocketId = socket.id;

      if (callback) {
        callback({
          success: true,
          status: room.status,
          currentQuestionIndex: room.currentQuestionIndex,
          counts: sessionManager.getCounts(roomCode)
        });
      }
    });

    socket.on('host:start_question', async (payload: { roomCode: string; questionIndex?: number }, callback?: Function) => {
      if (!authenticatedHost) {
        if (callback) callback({ success: false, message: 'Unauthorized' });
        return;
      }

      const roomCode = payload.roomCode?.toUpperCase();
      try {
        const { publicQuestion, deadline } = await sessionManager.startQuestion(roomCode, payload.questionIndex);

        // Broadcast to student and projector rooms
        io.to(`room:${roomCode}`).emit('question:started', {
          question: publicQuestion,
          deadline
        });

        // Broadcast updated counts
        const counts = sessionManager.getCounts(roomCode);
        io.to(`room:${roomCode}`).emit('counts:update', counts);

        if (callback) callback({ success: true, question: publicQuestion });
      } catch (err: any) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('host:close_question', async (payload: { roomCode: string }, callback?: Function) => {
      if (!authenticatedHost) {
        if (callback) callback({ success: false, message: 'Unauthorized' });
        return;
      }

      const roomCode = payload.roomCode?.toUpperCase();
      try {
        await sessionManager.closeQuestion(roomCode);
        io.to(`room:${roomCode}`).emit('question:closed');
        io.to(`room:${roomCode}`).emit('counts:update', sessionManager.getCounts(roomCode));

        if (callback) callback({ success: true });
      } catch (err: any) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('host:reveal_answer', async (payload: { roomCode: string }, callback?: Function) => {
      if (!authenticatedHost) {
        if (callback) callback({ success: false, message: 'Unauthorized' });
        return;
      }

      const roomCode = payload.roomCode?.toUpperCase();
      try {
        const { correctOption, explanation, stats, room } = await sessionManager.revealAnswer(roomCode);

        // Broadcast reveal payload
        io.to(`room:${roomCode}`).emit('question:revealed', {
          questionId: room.currentQuestion?.id,
          correctOption,
          explanation,
          stats
        });

        if (callback) callback({ success: true, correctOption, explanation, stats });
      } catch (err: any) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('host:show_leaderboard', async (payload: { roomCode: string }, callback?: Function) => {
      if (!authenticatedHost) {
        if (callback) callback({ success: false, message: 'Unauthorized' });
        return;
      }

      const roomCode = payload.roomCode?.toUpperCase();
      try {
        const { leaderboard } = await sessionManager.showLeaderboard(roomCode);
        io.to(`room:${roomCode}`).emit('leaderboard:update', {
          leaderboard,
          totalParticipants: leaderboard.length
        });

        if (callback) callback({ success: true, leaderboard });
      } catch (err: any) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('host:end_quiz', async (payload: { roomCode: string }, callback?: Function) => {
      if (!authenticatedHost) {
        if (callback) callback({ success: false, message: 'Unauthorized' });
        return;
      }

      const roomCode = payload.roomCode?.toUpperCase();
      try {
        const result = await sessionManager.endSession(roomCode);
        io.to(`room:${roomCode}`).emit('session:finished', result);

        if (callback) callback({ success: true, result });
      } catch (err: any) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    // ==========================================
    // STUDENT HANDLERS
    // ==========================================
    socket.on('student:join', async (payload: any, callback?: Function) => {
      const parsed = StudentJoinPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        if (callback) callback({ success: false, message: parsed.error.issues[0]?.message || 'Invalid join payload' });
        return;
      }

      const { roomCode, displayName, studentIdentifier, participantId } = parsed.data;

      try {
        const { participant, isNew, room } = await sessionManager.joinParticipant(
          roomCode,
          displayName,
          studentIdentifier,
          socket.id,
          participantId
        );

        socket.join(`room:${roomCode}`);
        socket.join(`student:${participant.id}`);

        // Notify host and projector
        const counts = sessionManager.getCounts(roomCode);
        io.to(`host:${roomCode}`).emit('counts:update', counts);
        io.to(`projector:${roomCode}`).emit('counts:update', counts);

        io.to(`host:${roomCode}`).emit('participant:joined', {
          participantId: participant.id,
          displayName: participant.displayName,
          studentIdentifier: participant.studentIdentifier
        });

        // Build state restoration for student
        const currentAnswer = room.currentQuestionAnswers.get(participant.id);
        let publicQuestion: PublicQuestion | null = null;
        if (room.currentQuestion && (room.status === 'question_active' || room.status === 'question_closed')) {
          publicQuestion = {
            id: room.currentQuestion.id!,
            question_text: room.currentQuestion.question_text,
            options: room.currentQuestion.options,
            points: room.currentQuestion.points,
            time_limit_seconds: room.currentQuestion.time_limit_seconds,
            question_order: room.currentQuestion.question_order,
            total_questions: (room.quiz.questions || []).length,
            deadline_timestamp: room.questionDeadline || 0
          };
        }

        let revealedResult = null;
        if (room.status === 'question_revealed' && room.currentQuestion) {
          revealedResult = {
            correctOption: room.currentQuestion.correct_option,
            explanation: room.currentQuestion.explanation || '',
            isCorrect: currentAnswer ? currentAnswer.isCorrect : false,
            pointsEarned: currentAnswer ? currentAnswer.pointsAwarded : 0
          };
        }

        const statePayload = {
          success: true,
          participantId: participant.id,
          displayName: participant.displayName,
          studentIdentifier: participant.studentIdentifier,
          totalScore: participant.totalScore,
          roomCode,
          sessionStatus: room.status,
          currentQuestion: publicQuestion,
          hasSubmittedCurrentQuestion: Boolean(currentAnswer),
          selectedOption: currentAnswer?.selectedOption || null,
          revealedResult
        };

        if (callback) callback(statePayload);
      } catch (err: any) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('student:submit_answer', async (payload: any, callback?: Function) => {
      const parsed = StudentSubmitAnswerPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        if (callback) callback({ accepted: false, message: 'Invalid answer payload' });
        return;
      }

      const { roomCode, participantId, questionId, selectedOption } = parsed.data;

      const result = await sessionManager.submitAnswer(roomCode, participantId, questionId, selectedOption);

      if (callback) {
        callback({
          accepted: result.accepted,
          message: result.message,
          selectedOption: result.accepted ? selectedOption : undefined,
          questionId
        });
      }
    });

    socket.on('student:reconnect', async (payload: any, callback?: Function) => {
      const parsed = StudentReconnectPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        if (callback) callback({ success: false, message: 'Invalid reconnect payload' });
        return;
      }

      const { roomCode, participantId } = parsed.data;
      const room = sessionManager.getRoom(roomCode);
      if (!room) {
        if (callback) callback({ success: false, message: 'Session no longer active' });
        return;
      }

      const participant = room.participants.get(participantId);
      if (!participant) {
        if (callback) callback({ success: false, message: 'Participant not recognized' });
        return;
      }

      socket.join(`room:${roomCode}`);
      socket.join(`student:${participantId}`);
      room.socketToParticipantId.delete(participant.socketId);
      participant.socketId = socket.id;
      participant.isConnected = true;
      participant.lastSeenAt = new Date().toISOString();
      room.socketToParticipantId.set(socket.id, participantId);

      // Notify host and projector
      const counts = sessionManager.getCounts(roomCode);
      io.to(`host:${roomCode}`).emit('counts:update', counts);
      io.to(`projector:${roomCode}`).emit('counts:update', counts);

      const currentAnswer = room.currentQuestionAnswers.get(participantId);
      let publicQuestion: PublicQuestion | null = null;
      if (room.currentQuestion && (room.status === 'question_active' || room.status === 'question_closed')) {
        publicQuestion = {
          id: room.currentQuestion.id!,
          question_text: room.currentQuestion.question_text,
          options: room.currentQuestion.options,
          points: room.currentQuestion.points,
          time_limit_seconds: room.currentQuestion.time_limit_seconds,
          question_order: room.currentQuestion.question_order,
          total_questions: (room.quiz.questions || []).length,
          deadline_timestamp: room.questionDeadline || 0
        };
      }

      let revealedResult = null;
      if (room.status === 'question_revealed' && room.currentQuestion) {
        revealedResult = {
          correctOption: room.currentQuestion.correct_option,
          explanation: room.currentQuestion.explanation || '',
          isCorrect: currentAnswer ? currentAnswer.isCorrect : false,
          pointsEarned: currentAnswer ? currentAnswer.pointsAwarded : 0
        };
      }

      if (callback) {
        callback({
          success: true,
          participantId: participant.id,
          displayName: participant.displayName,
          studentIdentifier: participant.studentIdentifier,
          totalScore: participant.totalScore,
          roomCode,
          sessionStatus: room.status,
          currentQuestion: publicQuestion,
          hasSubmittedCurrentQuestion: Boolean(currentAnswer),
          selectedOption: currentAnswer?.selectedOption || null,
          revealedResult
        });
      }
    });

    // ==========================================
    // PROJECTOR HANDLERS
    // ==========================================
    socket.on('projector:join', async (payload: { roomCode: string }, callback?: Function) => {
      const roomCode = payload.roomCode?.toUpperCase();
      const room = sessionManager.getRoom(roomCode);
      if (!room) {
        if (callback) callback({ success: false, message: 'Room not found' });
        return;
      }

      socket.join(`room:${roomCode}`);
      socket.join(`projector:${roomCode}`);

      let publicQuestion: PublicQuestion | null = null;
      if (room.currentQuestion) {
        publicQuestion = {
          id: room.currentQuestion.id!,
          question_text: room.currentQuestion.question_text,
          options: room.currentQuestion.options,
          points: room.currentQuestion.points,
          time_limit_seconds: room.currentQuestion.time_limit_seconds,
          question_order: room.currentQuestion.question_order,
          total_questions: (room.quiz.questions || []).length,
          deadline_timestamp: room.questionDeadline || 0
        };
      }

      const leaderboard = await sessionManager.getLeaderboard(roomCode);

      if (callback) {
        callback({
          success: true,
          status: room.status,
          counts: sessionManager.getCounts(roomCode),
          currentQuestion: publicQuestion,
          leaderboard,
          totalQuestions: (room.quiz.questions || []).length
        });
      }
    });

    // ==========================================
    // DISCONNECT
    // ==========================================
    socket.on('disconnect', () => {
      const disconnected = sessionManager.handleDisconnect(socket.id);
      if (disconnected && disconnected.roomCode) {
        const counts = sessionManager.getCounts(disconnected.roomCode);
        io.to(`host:${disconnected.roomCode}`).emit('counts:update', counts);
        io.to(`projector:${disconnected.roomCode}`).emit('counts:update', counts);
      }
    });
  });
}
