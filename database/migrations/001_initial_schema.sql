-- ========================================================
-- QuizX Live — Migration 001: Initial Schema
-- ========================================================

-- Enable UUID extension if not already enabled
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

-- Indexes for high-concurrency read/write performance
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

-- RLS Policies
-- Backend uses the service_role key to bypass RLS for all authoritative operations.
-- For anon/authenticated public reads (if direct Supabase data API is queried):
-- 1. Quizzes: public can view published quizzes, backend can manage
CREATE POLICY "Public can view published quizzes" ON quizzes
  FOR SELECT USING (status = 'published');

CREATE POLICY "Allow quiz manage" ON quizzes
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Questions: public read allowed
CREATE POLICY "Public can view questions" ON questions
  FOR SELECT USING (true);

CREATE POLICY "Allow question manage" ON questions
  FOR ALL USING (true) WITH CHECK (true);

-- 3. Sessions: read, insert and update
CREATE POLICY "Public can read session info" ON quiz_sessions
  FOR SELECT USING (true);

CREATE POLICY "Public can insert sessions" ON quiz_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update sessions" ON quiz_sessions
  FOR UPDATE USING (true);

-- 4. Participants: read, insert, update
CREATE POLICY "Public can read participants" ON participants
  FOR SELECT USING (true);

CREATE POLICY "Public can insert participants" ON participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update participants" ON participants
  FOR UPDATE USING (true);

-- 5. Answers: read and insert
CREATE POLICY "Public can read answers" ON answers
  FOR SELECT USING (true);

CREATE POLICY "Public can insert answers" ON answers
  FOR INSERT WITH CHECK (true);
