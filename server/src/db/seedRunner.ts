import { getDatabase } from './index';
import { DEMO_QUIZ } from './seedData';

async function runSeed() {
  console.log('[Seed] Starting database seeding for QuizX Live...');
  try {
    const db = getDatabase();
    const saved = await db.saveQuiz(DEMO_QUIZ);
    console.log(`[Seed] Successfully seeded "${saved.title}" with ${(saved.questions || []).length} questions! (ID: ${saved.id})`);
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Seeding failed:', error);
    process.exit(1);
  }
}

runSeed();
