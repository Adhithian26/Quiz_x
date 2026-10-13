-- ========================================================
-- QuizX Live — Migration 002: Seed AI Challenge Arena Quiz
-- ========================================================

DO $$
DECLARE
  v_quiz_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert Demo Quiz
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
