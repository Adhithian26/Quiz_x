import { Quiz, Question } from '@quizx/shared';

export const DEMO_QUIZ_ID = 'a0000000-0000-0000-0000-000000000001';

export const DEMO_QUESTIONS: Question[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    quiz_id: DEMO_QUIZ_ID,
    question_text: 'Which of the following best defines "Artificial Intelligence" compared to traditional programmed software?',
    options: [
      { key: 'A', text: 'Software that can only execute hardcoded if-else logic without adaptation' },
      { key: 'B', text: 'Systems capable of performing tasks that typically require human cognitive intelligence like reasoning and learning' },
      { key: 'C', text: 'Any computer application that connects to the public internet' },
      { key: 'D', text: 'Hardware robots that physically assemble electronic machinery' }
    ],
    correct_option: 'B',
    points: 100,
    time_limit_seconds: 25,
    question_order: 1,
    explanation: 'AI refers to computer systems engineered to emulate cognitive functions typically associated with human minds, including reasoning, pattern recognition, and adaptive learning.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    quiz_id: DEMO_QUIZ_ID,
    question_text: 'In Machine Learning, what fundamentally distinguishes Supervised Learning from Unsupervised Learning?',
    options: [
      { key: 'A', text: 'Supervised learning requires human engineers to sit next to the machine while it trains' },
      { key: 'B', text: 'Supervised learning uses labeled training data with ground-truth targets, while unsupervised learning discovers patterns in unlabeled data' },
      { key: 'C', text: 'Supervised learning only works on numerical values, while unsupervised works on images' },
      { key: 'D', text: 'Supervised learning does not need any loss function or mathematical optimization' }
    ],
    correct_option: 'B',
    points: 100,
    time_limit_seconds: 25,
    question_order: 2,
    explanation: 'Supervised algorithms learn mappings from input features to known target labels, whereas unsupervised algorithms discover inherent clusters and distributions without ground-truth labels.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    quiz_id: DEMO_QUIZ_ID,
    question_text: 'What core deep learning architecture introduced in the 2017 paper "Attention Is All You Need" powers modern LLMs like GPT, Gemini, and Claude?',
    options: [
      { key: 'A', text: 'Convolutional Neural Networks (CNN)' },
      { key: 'B', text: 'Recurrent Neural Networks (RNN)' },
      { key: 'C', text: 'Transformer Architecture' },
      { key: 'D', text: 'Multi-Layer Perceptron (MLP)' }
    ],
    correct_option: 'C',
    points: 100,
    time_limit_seconds: 25,
    question_order: 3,
    explanation: 'The Transformer architecture revolutionized NLP by utilizing self-attention mechanisms to process sequence tokens in parallel rather than sequential recurrence.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000004',
    quiz_id: DEMO_QUIZ_ID,
    question_text: 'What is "Few-Shot Prompting" when interacting with a Large Language Model?',
    options: [
      { key: 'A', text: 'Prompting the model only 3 to 5 times per day to conserve API quota' },
      { key: 'B', text: 'Providing the model with a few concrete input-output examples inside the prompt before requesting the final answer' },
      { key: 'C', text: 'Taking photographic snapshots of physical documents and feeding them as images' },
      { key: 'D', text: 'Generating multiple random responses and selecting the shortest one' }
    ],
    correct_option: 'B',
    points: 100,
    time_limit_seconds: 25,
    question_order: 4,
    explanation: 'Few-shot prompting provides in-context exemplar demonstrations of inputs and desired outputs, guiding the model toward the intended tone, format, and reasoning pattern.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000005',
    quiz_id: DEMO_QUIZ_ID,
    question_text: 'What is an "AI hallucination" in generative language models?',
    options: [
      { key: 'A', text: 'When a computer screen displays visual glitches due to GPU thermal throttling' },
      { key: 'B', text: 'When an AI model generates factually incorrect or fabricated statements with high confidence' },
      { key: 'C', text: 'When an AI agent intentionally deceives human users for entertainment' },
      { key: 'D', text: 'When the server enters low-power standby mode during inference' }
    ],
    correct_option: 'B',
    points: 100,
    time_limit_seconds: 25,
    question_order: 5,
    explanation: 'Hallucinations occur because generative models predict statistically probable token sequences rather than retrieving verified ground truth, sometimes asserting falsehoods convincingly.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000006',
    quiz_id: DEMO_QUIZ_ID,
    question_text: 'How does Retrieval-Augmented Generation (RAG) ground an LLM on private enterprise data and mitigate hallucinations?',
    options: [
      { key: 'A', text: 'It completely retrains the foundational neural weights from scratch every single night' },
      { key: 'B', text: 'It semantically searches relevant chunks from external documents and inserts them into prompt context for the LLM to ground its answer' },
      { key: 'C', text: 'It automatically converts all enterprise documentation into binary machine bytecode' },
      { key: 'D', text: 'It bypasses the LLM and displays an unranked list of raw Google search links' }
    ],
    correct_option: 'B',
    points: 100,
    time_limit_seconds: 25,
    question_order: 6,
    explanation: 'RAG utilizes vector embeddings and semantic search to extract relevant snippets from knowledge bases, supplying them as factual reference context in the generation prompt.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000007',
    quiz_id: DEMO_QUIZ_ID,
    question_text: 'Which of the following is considered an essential best practice in Responsible AI deployment?',
    options: [
      { key: 'A', text: 'Uploading unfiltered corporate passwords and private customer records to public consumer chatbots' },
      { key: 'B', text: 'Auditing models for bias, safeguarding user data privacy, and maintaining human-in-the-loop oversight' },
      { key: 'C', text: 'Disabling all moderation filters and ethical guardrails to maximize throughput' },
      { key: 'D', text: 'Stating that AI models are legally responsible for all consequences' }
    ],
    correct_option: 'B',
    points: 100,
    time_limit_seconds: 25,
    question_order: 7,
    explanation: 'Responsible AI frameworks demand algorithmic fairness auditing, rigorous data privacy adherence, transparent attribution, and human oversight in critical decisions.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000008',
    quiz_id: DEMO_QUIZ_ID,
    question_text: 'How do modern AI diffusion models (such as Stable Diffusion or Midjourney) generate images from text descriptions?',
    options: [
      { key: 'A', text: 'They copy and stitch existing copyright images directly from web search indexes' },
      { key: 'B', text: 'They start from random Gaussian noise and iteratively denoise the latent space guided by text prompt embeddings' },
      { key: 'C', text: 'They render primitive 3D polygons in an OpenGL game engine' },
      { key: 'D', text: 'They calculate mathematical fractal equations without neural networks' }
    ],
    correct_option: 'B',
    points: 100,
    time_limit_seconds: 25,
    question_order: 8,
    explanation: 'Diffusion models learn to reverse a gradual noising process: starting with random latent noise, a neural network iteratively predicts and strips noise conditioned on text prompts.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000009',
    quiz_id: DEMO_QUIZ_ID,
    question_text: 'When using AI coding assistants (like Copilot or Antigravity), what is the developer’s primary responsibility?',
    options: [
      { key: 'A', text: 'Blindly accept and commit every code suggestion without reading the diff' },
      { key: 'B', text: 'Review logic, verify security, test edge cases, and validate system architecture' },
      { key: 'C', text: 'Stop writing automated unit and integration tests completely' },
      { key: 'D', text: 'Disable compilers and linters to write code faster' }
    ],
    correct_option: 'B',
    points: 100,
    time_limit_seconds: 25,
    question_order: 9,
    explanation: 'AI coding assistants accelerate implementation, but developers remain accountable for validating logic, security auditing, edge-case coverage, and architectural integrity.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000010',
    quiz_id: DEMO_QUIZ_ID,
    question_text: 'Which scenario best exemplifies an autonomous AI Agent performing multi-step reasoning rather than a simple single-turn chatbot?',
    options: [
      { key: 'A', text: 'A static contact form that triggers an email notification' },
      { key: 'B', text: 'A grammar checker that highlights a misspelling' },
      { key: 'C', text: 'An autonomous coding agent that reads a bug report, searches the codebase, plans a fix, runs test suites, and opens a PR' },
      { key: 'D', text: 'A digital clock showing the current time in UTC' }
    ],
    correct_option: 'C',
    points: 100,
    time_limit_seconds: 25,
    question_order: 10,
    explanation: 'Autonomous AI Agents decompose multi-step goals into actions, utilize tools and environment feedback loops, inspect outputs, and self-correct until the target task is accomplished.'
  }
];

export const DEMO_QUIZ: Quiz = {
  id: DEMO_QUIZ_ID,
  title: 'AI Challenge Arena',
  description: 'Official interactive quiz for the college AI workshop covering foundations, LLMs, prompt engineering, RAG, and real-world agents.',
  status: 'published',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  questions: DEMO_QUESTIONS
};
