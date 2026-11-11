import { Question, OptionKey, QuestionOption } from '@quizx/shared';
import { v4 as uuidv4 } from 'uuid';

export interface ParsedQuizResult {
  title?: string;
  description?: string;
  questions: Question[];
  warnings: string[];
}

const DEFAULT_OPTIONS: QuestionOption[] = [
  { key: 'A', text: '' },
  { key: 'B', text: '' },
  { key: 'C', text: '' },
  { key: 'D', text: '' }
];

export function parseQuizInput(rawContent: string): ParsedQuizResult {
  const content = rawContent.trim();
  const warnings: string[] = [];

  if (!content) {
    return { questions: [], warnings: ['Input text is empty.'] };
  }

  // 1. Try parsing as JSON first
  if ((content.startsWith('{') && content.endsWith('}')) || (content.startsWith('[') && content.endsWith(']'))) {
    try {
      const parsed = JSON.parse(content);
      return parseJsonQuiz(parsed, warnings);
    } catch {
      // Fall through to text/markdown/csv parser
    }
  }

  // 2. Try parsing as CSV if comma-delimited lines with header
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length > 1 && (lines[0].toLowerCase().includes('question') && lines[0].includes(','))) {
    try {
      const csvResult = parseCsvQuiz(lines, warnings);
      if (csvResult.questions.length > 0) {
        return csvResult;
      }
    } catch {
      // Fall through to text parser
    }
  }

  // 3. Parse formatted Plain Text / Markdown
  return parseStructuredText(content, warnings);
}

function parseJsonQuiz(parsed: any, warnings: string[]): ParsedQuizResult {
  let title: string | undefined;
  let description: string | undefined;
  let rawQuestions: any[] = [];

  if (Array.isArray(parsed)) {
    rawQuestions = parsed;
  } else if (typeof parsed === 'object' && parsed !== null) {
    title = parsed.title;
    description = parsed.description;
    rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
  }

  const questions: Question[] = [];

  rawQuestions.forEach((q, idx) => {
    const qText = q.question_text || q.question || q.prompt || '';
    if (!qText) {
      warnings.push(`JSON item #${idx + 1} skipped: missing question text.`);
      return;
    }

    let options: QuestionOption[] = [];
    if (Array.isArray(q.options)) {
      if (typeof q.options[0] === 'string') {
        const keys: OptionKey[] = ['A', 'B', 'C', 'D'];
        options = q.options.slice(0, 4).map((text: string, i: number) => ({
          key: keys[i] || 'A',
          text: String(text).trim()
        }));
      } else {
        options = q.options.map((opt: any) => ({
          key: (opt.key || 'A').toUpperCase() as OptionKey,
          text: String(opt.text || '').trim()
        }));
      }
    }

    // Ensure 4 options
    while (options.length < 4) {
      const missingKey = (['A', 'B', 'C', 'D'][options.length]) as OptionKey;
      options.push({ key: missingKey, text: `Option ${missingKey}` });
    }

    const correct = (q.correct_option || q.answer || q.correctAnswer || 'A').toUpperCase().trim();
    const correctKey: OptionKey = ['A', 'B', 'C', 'D'].includes(correct) ? (correct as OptionKey) : 'A';

    questions.push({
      id: q.id || uuidv4(),
      question_text: qText,
      options: options.slice(0, 4),
      correct_option: correctKey,
      points: Number(q.points) || 100,
      time_limit_seconds: Number(q.time_limit_seconds || q.timeLimit || q.timer) || 30,
      question_order: questions.length + 1,
      explanation: q.explanation || ''
    });
  });

  return { title, description, questions, warnings };
}

function parseCsvQuiz(lines: string[], warnings: string[]): ParsedQuizResult {
  const questions: Question[] = [];
  // Assumed header: Question, Option A, Option B, Option C, Option D, Correct Option, Explanation, Points, Time
  const dataRows = lines.slice(1);

  dataRows.forEach((row, idx) => {
    // Simple CSV splitter handling quoted fields
    const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 6) {
      warnings.push(`CSV Row #${idx + 2} skipped: insufficient columns (requires at least Question, 4 options, and Correct Option).`);
      return;
    }

    const questionText = cols[0];
    const options: QuestionOption[] = [
      { key: 'A', text: cols[1] || '' },
      { key: 'B', text: cols[2] || '' },
      { key: 'C', text: cols[3] || '' },
      { key: 'D', text: cols[4] || '' }
    ];

    const correctRaw = (cols[5] || 'A').toUpperCase().trim();
    const correctKey: OptionKey = ['A', 'B', 'C', 'D'].includes(correctRaw) ? (correctRaw as OptionKey) : 'A';
    const explanation = cols[6] || '';
    const points = Number(cols[7]) || 100;
    const timeLimit = Number(cols[8]) || 30;

    questions.push({
      id: uuidv4(),
      question_text: questionText,
      options,
      correct_option: correctKey,
      points,
      time_limit_seconds: timeLimit,
      question_order: questions.length + 1,
      explanation
    });
  });

  return { questions, warnings };
}

function parseStructuredText(text: string, warnings: string[]): ParsedQuizResult {
  const lines = text.split(/\r?\n/);
  let title: string | undefined;
  let description: string | undefined;

  interface RawBlock {
    qText: string[];
    options: Map<OptionKey, string>;
    answer?: OptionKey;
    explanation?: string;
    points?: number;
    time?: number;
  }

  const blocks: RawBlock[] = [];
  let currentBlock: RawBlock | null = null;
  let inExplanation = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      inExplanation = false;
      continue;
    }

    // Check header metadata
    if (!currentBlock && blocks.length === 0) {
      const titleMatch = line.match(/^(?:title|quiz\s*title|quiz\s*name):\s*(.+)$/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
        continue;
      }
      const descMatch = line.match(/^(?:description|desc|subtitle):\s*(.+)$/i);
      if (descMatch) {
        description = descMatch[1].trim();
        continue;
      }
    }

    // Detect Question start (e.g. "Q1:", "1.", "1)", "Question 1:", "1. Question text")
    const qStartMatch = line.match(/^(?:Q\s*\d+[\s:.-]+|\d+[\s.)-]+\s+|Question\s*\d+[\s:.-]+)(.+)$/i);
    if (qStartMatch) {
      if (currentBlock && currentBlock.qText.length > 0) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        qText: [qStartMatch[1].trim()],
        options: new Map<OptionKey, string>()
      };
      inExplanation = false;
      continue;
    }

    // Detect Option line (e.g. "A)", "A.", "[A]", "- A:", "A -")
    const optMatch = line.match(/^[-*]?\s*(?:\[|\()?([A-D])(?:\]|\)|\.|\s*[-:])\s*(.+)$/i);
    if (optMatch && currentBlock) {
      const optKey = optMatch[1].toUpperCase() as OptionKey;
      currentBlock.options.set(optKey, optMatch[2].trim());
      inExplanation = false;
      continue;
    }

    // Detect Answer key (e.g. "Answer: B", "Correct: B", "Ans: C", "Correct Answer: A")
    const ansMatch = line.match(/^(?:correct\s*answer|answer|ans|correct|key):\s*(?:\[|\()?([A-D])(?:\]|\))?/i);
    if (ansMatch && currentBlock) {
      currentBlock.answer = ansMatch[1].toUpperCase() as OptionKey;
      inExplanation = false;
      continue;
    }

    // Detect Explanation (e.g. "Explanation: ...", "Note: ...")
    const expMatch = line.match(/^(?:explanation|expl|note|why):\s*(.+)$/i);
    if (expMatch && currentBlock) {
      currentBlock.explanation = expMatch[1].trim();
      inExplanation = true;
      continue;
    }

    // Detect Timer/Points (e.g. "Time: 25s", "Points: 100")
    const timeMatch = line.match(/^(?:time|timer|time\s*limit):\s*(\d+)/i);
    if (timeMatch && currentBlock) {
      currentBlock.time = parseInt(timeMatch[1], 10);
      continue;
    }
    const pointsMatch = line.match(/^(?:points|pts|score):\s*(\d+)/i);
    if (pointsMatch && currentBlock) {
      currentBlock.points = parseInt(pointsMatch[1], 10);
      continue;
    }

    // Continuation line
    if (currentBlock) {
      if (inExplanation && currentBlock.explanation) {
        currentBlock.explanation += ' ' + line;
      } else if (currentBlock.options.size === 0) {
        // Still part of question text
        currentBlock.qText.push(line);
      }
    }
  }

  if (currentBlock && currentBlock.qText.length > 0) {
    blocks.push(currentBlock);
  }

  const questions: Question[] = [];

  blocks.forEach((b, idx) => {
    const qText = b.qText.join(' ').trim();
    if (!qText) return;

    const options: QuestionOption[] = (['A', 'B', 'C', 'D'] as OptionKey[]).map((key) => ({
      key,
      text: b.options.get(key) || ''
    }));

    // If options are missing
    const missingKeys = options.filter(o => !o.text).map(o => o.key);
    if (missingKeys.length > 0) {
      warnings.push(`Question #${idx + 1} has missing options: [${missingKeys.join(', ')}]. Placeholder text added.`);
      missingKeys.forEach(k => {
        const found = options.find(o => o.key === k);
        if (found) found.text = `Option ${k}`;
      });
    }

    questions.push({
      id: uuidv4(),
      question_text: qText,
      options,
      correct_option: b.answer || 'A',
      points: b.points || 100,
      time_limit_seconds: b.time || 30,
      question_order: questions.length + 1,
      explanation: b.explanation || ''
    });
  });

  if (questions.length === 0) {
    warnings.push('No questions could be recognized. Please check the sample format.');
  }

  return { title, description, questions, warnings };
}

export const SAMPLE_QUIZ_TEMPLATE = `Title: Cloud & AI Fundamentals
Description: Essential practice questions for developers

Q1: Which architecture powers modern Large Language Models?
A) Convolutional Neural Network
B) Transformer Architecture
C) Multi-Layer Perceptron
D) Recurrent Neural Network
Answer: B
Explanation: The Transformer model introduced in 2017 uses self-attention mechanisms to power state-of-the-art LLMs.
Time: 30s
Points: 100

Q2: What is the main characteristic of an immutable data structure?
A) It cannot be modified after it is created
B) It automatically saves changes to the cloud
C) It can only hold numeric floating-point values
D) It is garbage-collected immediately
Answer: A
Explanation: Immutable objects guarantee safety in concurrent systems because their state cannot change after instantiation.
Time: 25s
Points: 100
`;
