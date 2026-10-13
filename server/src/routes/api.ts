import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { SessionManager } from '../services/sessionManager';
import { QuizSchema } from '@quizx/shared';
import { config } from '../config';

export function createApiRouter(sessionManager: SessionManager): Router {
  const router = Router();
  const db = getDatabase();

  // Health endpoint with metrics
  router.get('/health', (req: Request, res: Response) => {
    const memory = process.memoryUsage();
    res.json({
      status: 'healthy',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: config.hasSupabase ? 'supabase-postgresql' : 'in-memory-adapter',
      memory: {
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024))
      }
    });
  });

  // Host verification
  router.post('/api/auth/verify', (req: Request, res: Response) => {
    const { hostSecret } = req.body;
    if (hostSecret === config.hostSecret) {
      res.json({ valid: true });
    } else {
      res.status(401).json({ valid: false, message: 'Invalid host secret' });
    }
  });

  // Get all quizzes
  router.get('/api/quizzes', async (req: Request, res: Response) => {
    try {
      const quizzes = await db.getQuizzes();
      res.json({ quizzes });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get quiz by id
  router.get('/api/quizzes/:id', async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quiz = await db.getQuizById(id);
      if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
      }
      res.json({ quiz });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create or update quiz
  router.post('/api/quizzes', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${config.hostSecret}`) {
      return res.status(401).json({ error: 'Unauthorized: Valid host secret required' });
    }

    const parsed = QuizSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid quiz payload', details: parsed.error.issues });
    }

    try {
      const saved = await db.saveQuiz(parsed.data);
      res.json({ quiz: saved });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete quiz
  router.delete('/api/quizzes/:id', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${config.hostSecret}`) {
      return res.status(401).json({ error: 'Unauthorized: Valid host secret required' });
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const deleted = await db.deleteQuiz(id);
      res.json({ success: deleted });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Session state by room code
  router.get('/api/sessions/:roomCode', async (req: Request, res: Response) => {
    const rawCode = Array.isArray(req.params.roomCode) ? req.params.roomCode[0] : req.params.roomCode;
    const roomCode = String(rawCode || '').toUpperCase();
    const activeRoom = sessionManager.getRoom(roomCode);
    if (activeRoom) {
      return res.json({
        exists: true,
        isActive: true,
        roomCode,
        status: activeRoom.status,
        counts: sessionManager.getCounts(roomCode)
      });
    }

    // Check DB
    const dbSession = await db.getSessionByRoomCode(roomCode);
    if (dbSession) {
      return res.json({
        exists: true,
        isActive: false,
        roomCode,
        status: dbSession.status
      });
    }

    res.status(404).json({ exists: false, message: 'Room not found' });
  });

  // CSV Export for session
  router.get('/api/sessions/:sessionId/export/csv', async (req: Request, res: Response) => {
    try {
      const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
      const csv = await sessionManager.exportCsv(sessionId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="quizx_results_${sessionId}.csv"`);
      res.status(200).send(csv);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
