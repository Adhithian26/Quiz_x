-- ========================================================
-- QuizX Live — Complete All-In-One Database Setup
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/xxpovkhhdhhobsilyiid/sql
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Quizzes Table
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Questions Table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option VARCHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  points INTEGER NOT NULL DEFAULT 100 CHECK (points > 0),
  time_limit_seconds INTEGER NOT NULL DEFAULT 30 CHECK (time_limit_seconds >= 5 AND time_limit_seconds <= 120),
  question_order INTEGER NOT NULL CHECK (question_order > 0),
  explanation TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_quiz_question_order UNIQUE (quiz_id, question_order)
);

-- 3. Quiz Sessions Table
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  room_code VARCHAR(8) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL CHECK (status IN ('waiting', 'question_active', 'question_closed', 'question_revealed', 'leaderboard', 'finished')) DEFAULT 'waiting',
  current_question_order INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Participants Table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  display_name VARCHAR(50) NOT NULL,
  student_identifier VARCHAR(50),
  total_score INTEGER NOT NULL DEFAULT 0 CHECK (total_score >= 0),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_session_participant UNIQUE (session_id, display_name)
);

-- 5. Answers Table
CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option VARCHAR(1) NOT NULL CHECK (selected_option IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded >= 0),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_answer_per_question UNIQUE (session_id, participant_id, question_id)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_room_code ON quiz_sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_participants_session_id ON participants(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_score ON participants(session_id, total_score DESC);
CREATE INDEX IF NOT EXISTS idx_answers_session_id ON answers(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_participant_id ON answers(participant_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);

-- Enable Row Level Security (RLS)
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public can view published quizzes" ON quizzes;
DROP POLICY IF EXISTS "Allow quiz manage" ON quizzes;
DROP POLICY IF EXISTS "Public can view questions" ON questions;
DROP POLICY IF EXISTS "Allow question manage" ON questions;
DROP POLICY IF EXISTS "Public can read session info" ON quiz_sessions;
DROP POLICY IF EXISTS "Public can insert sessions" ON quiz_sessions;
DROP POLICY IF EXISTS "Public can update sessions" ON quiz_sessions;
DROP POLICY IF EXISTS "Public can read participants" ON participants;
DROP POLICY IF EXISTS "Public can insert participants" ON participants;
DROP POLICY IF EXISTS "Public can update participants" ON participants;
DROP POLICY IF EXISTS "Public can read answers" ON answers;
DROP POLICY IF EXISTS "Public can insert answers" ON answers;

-- Create Policies
CREATE POLICY "Public can view published quizzes" ON quizzes FOR SELECT USING (status = 'published');
CREATE POLICY "Allow quiz manage" ON quizzes FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public can view questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Allow question manage" ON questions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public can read session info" ON quiz_sessions FOR SELECT USING (true);
CREATE POLICY "Public can insert sessions" ON quiz_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update sessions" ON quiz_sessions FOR UPDATE USING (true);

CREATE POLICY "Public can read participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Public can insert participants" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update participants" ON participants FOR UPDATE USING (true);

CREATE POLICY "Public can read answers" ON answers FOR SELECT USING (true);
CREATE POLICY "Public can insert answers" ON answers FOR INSERT WITH CHECK (true);

-- ========================================================
-- Seed Demo Quiz: AI Challenge Arena
-- ========================================================
DO $$
DECLARE
  v_quiz_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO quizzes (id, title, description, status)
  VALUES (
    v_quiz_id,
    'AI Challenge Arena',
    'Official interactive quiz for the college AI workshop covering foundations, LLMs, prompt engineering, RAG, and real-world agents.',
    'published'
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status;

  -- 1. AI Fundamentals
  INSERT INTO questions (quiz_id, question_text, options, correct_option, points, time_limit_seconds, question_order, explanation)
  VALUES (
    v_quiz_id,
    'Which of the following best defines "Artificial Intelligence" compared to traditional programmed software?',
    '[
      {"key": "A", "text": "Software that can only execute hardcoded if-else logic without adaptation"},
      {"key": "B", "text": "Systems capable of performing tasks that typically require human cognitive intelligence like reasoning and learning"},
      {"key": "C", "text": "Any computer application that connects to the public internet"},
      {"key": "D", "text": "Hardware robots that physically assemble electronic machinery"}
    ]'::jsonb,
    'B',
    100,
    25,
    1,
    'AI refers to computer systems engineered to emulate cognitive functions typically associated with human minds, including reasoning, pattern recognition, and adaptive learning.'
  )
  ON CONFLICT (quiz_id, question_order) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    options = EXCLUDED.options,
    correct_option = EXCLUDED.correct_option,
    points = EXCLUDED.points,
    time_limit_seconds = EXCLUDED.time_limit_seconds,
    explanation = EXCLUDED.explanation;

  -- 2. Machine Learning
  INSERT INTO questions (quiz_id, question_text, options, correct_option, points, time_limit_seconds, question_order, explanation)
  VALUES (
    v_quiz_id,
    'In Machine Learning, what fundamentally distinguishes Supervised Learning from Unsupervised Learning?',
    '[
      {"key": "A", "text": "Supervised learning requires human engineers to sit next to the machine while it trains"},
      {"key": "B", "text": "Supervised learning uses labeled training data with ground-truth targets, while unsupervised learning discovers patterns in unlabeled data"},
      {"key": "C", "text": "Supervised learning only works on numerical values, while unsupervised works on images"},
      {"key": "D", "text": "Supervised learning does not need any loss function or mathematical optimization"}
    ]'::jsonb,
    'B',
    100,
    25,
    2,
    'Supervised algorithms learn mappings from input features to known target labels, whereas unsupervised algorithms discover inherent clusters and distributions without ground-truth labels.'
  )
  ON CONFLICT (quiz_id, question_order) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    options = EXCLUDED.options,
    correct_option = EXCLUDED.correct_option,
    points = EXCLUDED.points,
    time_limit_seconds = EXCLUDED.time_limit_seconds,
    explanation = EXCLUDED.explanation;

  -- 3. Large Language Models
  INSERT INTO questions (quiz_id, question_text, options, correct_option, points, time_limit_seconds, question_order, explanation)
  VALUES (
    v_quiz_id,
    'What core deep learning architecture introduced in the 2017 paper "Attention Is All You Need" powers modern LLMs like GPT, Gemini, and Claude?',
    '[
      {"key": "A", "text": "Convolutional Neural Networks (CNN)"},
      {"key": "B", "text": "Recurrent Neural Networks (RNN)"},
      {"key": "C", "text": "Transformer Architecture"},
      {"key": "D", "text": "Multi-Layer Perceptron (MLP)"}
    ]'::jsonb,
    'C',
    100,
    25,
    3,
    'The Transformer architecture revolutionized NLP by utilizing self-attention mechanisms to process sequence tokens in parallel rather than sequential recurrence.'
  )
  ON CONFLICT (quiz_id, question_order) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    options = EXCLUDED.options,
    correct_option = EXCLUDED.correct_option,
    points = EXCLUDED.points,
    time_limit_seconds = EXCLUDED.time_limit_seconds,
    explanation = EXCLUDED.explanation;

  -- 4. Prompt Engineering
  INSERT INTO questions (quiz_id, question_text, options, correct_option, points, time_limit_seconds, question_order, explanation)
  VALUES (
    v_quiz_id,
    'What is "Few-Shot Prompting" when interacting with a Large Language Model?',
    '[
      {"key": "A", "text": "Prompting the model only 3 to 5 times per day to conserve API quota"},
      {"key": "B", "text": "Providing the model with a few concrete input-output examples inside the prompt before requesting the final answer"},
      {"key": "C", "text": "Taking photographic snapshots of physical documents and feeding them as images"},
      {"key": "D", "text": "Generating multiple random responses and selecting the shortest one"}
    ]'::jsonb,
    'B',
    100,
    25,
    4,
    'Few-shot prompting provides in-context exemplar demonstrations of inputs and desired outputs, guiding the model toward the intended tone, format, and reasoning pattern.'
  )
  ON CONFLICT (quiz_id, question_order) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    options = EXCLUDED.options,
    correct_option = EXCLUDED.correct_option,
    points = EXCLUDED.points,
    time_limit_seconds = EXCLUDED.time_limit_seconds,
    explanation = EXCLUDED.explanation;

  -- 5. AI Hallucinations
  INSERT INTO questions (quiz_id, question_text, options, correct_option, points, time_limit_seconds, question_order, explanation)
  VALUES (
    v_quiz_id,
    'What is an "AI hallucination" in generative language models?',
    '[
      {"key": "A", "text": "When a computer screen displays visual glitches due to GPU thermal throttling"},
      {"key": "B", "text": "When an AI model generates factually incorrect or fabricated statements with high confidence"},
      {"key": "C", "text": "When an AI agent intentionally deceives human users for entertainment"},
      {"key": "D", "text": "When the server enters low-power standby mode during inference"}
    ]'::jsonb,
    'B',
    100,
    25,
    5,
    'Hallucinations occur because generative models predict statistically probable token sequences rather than retrieving verified ground truth, sometimes asserting falsehoods convincingly.'
  )
  ON CONFLICT (quiz_id, question_order) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    options = EXCLUDED.options,
    correct_option = EXCLUDED.correct_option,
    points = EXCLUDED.points,
    time_limit_seconds = EXCLUDED.time_limit_seconds,
    explanation = EXCLUDED.explanation;

  -- 6. Retrieval-Augmented Generation (RAG)
  INSERT INTO questions (quiz_id, question_text, options, correct_option, points, time_limit_seconds, question_order, explanation)
  VALUES (
    v_quiz_id,
    'How does Retrieval-Augmented Generation (RAG) ground an LLM on private enterprise data and mitigate hallucinations?',
    '[
      {"key": "A", "text": "It completely retrains the foundational neural weights from scratch every single night"},
      {"key": "B", "text": "It semantically searches relevant chunks from external documents and inserts them into prompt context for the LLM to ground its answer"},
      {"key": "C", "text": "It automatically converts all enterprise documentation into binary machine bytecode"},
      {"key": "D", "text": "It bypasses the LLM and displays an unranked list of raw Google search links"}
    ]'::jsonb,
    'B',
    100,
    25,
    6,
    'RAG utilizes vector embeddings and semantic search to extract relevant snippets from knowledge bases, supplying them as factual reference context in the generation prompt.'
  )
  ON CONFLICT (quiz_id, question_order) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    options = EXCLUDED.options,
    correct_option = EXCLUDED.correct_option,
    points = EXCLUDED.points,
    time_limit_seconds = EXCLUDED.time_limit_seconds,
    explanation = EXCLUDED.explanation;

  -- 7. Responsible AI and Privacy
  INSERT INTO questions (quiz_id, question_text, options, correct_option, points, time_limit_seconds, question_order, explanation)
  VALUES (
    v_quiz_id,
    'Which of the following is considered an essential best practice in Responsible AI deployment?',
    '[
      {"key": "A", "text": "Uploading unfiltered corporate passwords and private customer records to public consumer chatbots"},
      {"key": "B", "text": "Auditing models for bias, safeguarding user data privacy, and maintaining human-in-the-loop oversight"},
      {"key": "C", "text": "Disabling all moderation filters and ethical guardrails to maximize throughput"},
      {"key": "D", "text": "Stating that AI models are legally responsible for all consequences"}
    ]'::jsonb,
    'B',
    100,
    25,
    7,
    'Responsible AI frameworks demand algorithmic fairness auditing, rigorous data privacy adherence, transparent attribution, and human oversight in critical decisions.'
  )
  ON CONFLICT (quiz_id, question_order) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    options = EXCLUDED.options,
    correct_option = EXCLUDED.correct_option,
    points = EXCLUDED.points,
    time_limit_seconds = EXCLUDED.time_limit_seconds,
    explanation = EXCLUDED.explanation;

  -- 8. Image Generation
  INSERT INTO questions (quiz_id, question_text, options, correct_option, points, time_limit_seconds, question_order, explanation)
  VALUES (
    v_quiz_id,
    'How do modern AI diffusion models (such as Stable Diffusion or Midjourney) generate images from text descriptions?',
    '[
      {"key": "A", "text": "They copy and stitch existing copyright images directly from web search indexes"},
      {"key": "B", "text": "They start from random Gaussian noise and iteratively denoise the latent space guided by text prompt embeddings"},
      {"key": "C", "text": "They render primitive 3D polygons in an OpenGL game engine"},
      {"key": "D", "text": "They calculate mathematical fractal equations without neural networks"}
    ]'::jsonb,
    'B',
    100,
    25,
    8,
    'Diffusion models learn to reverse a gradual noising process: starting with random latent noise, a neural network iteratively predicts and strips noise conditioned on text prompts.'
  )
  ON CONFLICT (quiz_id, question_order) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    options = EXCLUDED.options,
    correct_option = EXCLUDED.correct_option,
    points = EXCLUDED.points,
    time_limit_seconds = EXCLUDED.time_limit_seconds,
    explanation = EXCLUDED.explanation;

  -- 9. AI Productivity Tools
  INSERT INTO questions (quiz_id, question_text, options, correct_option, points, time_limit_seconds, question_order, explanation)
  VALUES (
    v_quiz_id,
    'When using AI coding assistants (like Copilot or Antigravity), what is the developer’s primary responsibility?',
    '[
      {"key": "A", "text": "Blindly accept and commit every code suggestion without reading the diff"},
      {"key": "B", "text": "Review logic, verify security, test edge cases, and validate system architecture"},
      {"key": "C", "text": "Stop writing automated unit and integration tests completely"},
      {"key": "D", "text": "Disable compilers and linters to write code faster"}
    ]'::jsonb,
    'B',
    100,
    25,
    9,
    'AI coding assistants accelerate implementation, but developers remain accountable for validating logic, security auditing, edge-case coverage, and architectural integrity.'
  )
  ON CONFLICT (quiz_id, question_order) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    options = EXCLUDED.options,
    correct_option = EXCLUDED.correct_option,
    points = EXCLUDED.points,
    time_limit_seconds = EXCLUDED.time_limit_seconds,
    explanation = EXCLUDED.explanation;

  -- 10. Real-World AI Applications
  INSERT INTO questions (quiz_id, question_text, options, correct_option, points, time_limit_seconds, question_order, explanation)
  VALUES (
    v_quiz_id,
    'Which scenario best exemplifies an autonomous AI Agent performing multi-step reasoning rather than a simple single-turn chatbot?',
    '[
      {"key": "A", "text": "A static contact form that triggers an email notification"},
      {"key": "B", "text": "A grammar checker that highlights a misspelling"},
      {"key": "C", "text": "An autonomous coding agent that reads a bug report, searches the codebase, plans a fix, runs test suites, and opens a PR"},
      {"key": "D", "text": "A digital clock showing the current time in UTC"}
    ]'::jsonb,
    'B',
    100,
    25,
    10,
    'Autonomous AI Agents decompose multi-step goals into actions, utilize tools and environment feedback loops, inspect outputs, and self-correct until the target task is accomplished.'
  )
  ON CONFLICT (quiz_id, question_order) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    options = EXCLUDED.options,
    correct_option = EXCLUDED.correct_option,
    points = EXCLUDED.points,
    time_limit_seconds = EXCLUDED.time_limit_seconds,
    explanation = EXCLUDED.explanation;

END $$;
