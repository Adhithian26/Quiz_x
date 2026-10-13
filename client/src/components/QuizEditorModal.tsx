import React, { useState, useEffect } from 'react';
import { Quiz, Question, OptionKey, QuestionOption } from '@quizx/shared';
import { saveQuiz } from '../services/api';
import {
  X,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Clock,
  Award,
  HelpCircle,
  Sparkles,
  AlertCircle,
  Save
} from 'lucide-react';

interface QuizEditorModalProps {
  isOpen: boolean;
  quiz: Quiz | null; // null = create new, Quiz = edit existing
  hostSecret: string;
  onClose: () => void;
  onSaved: (quiz: Quiz) => void;
}

const DEFAULT_OPTIONS: QuestionOption[] = [
  { key: 'A', text: '' },
  { key: 'B', text: '' },
  { key: 'C', text: '' },
  { key: 'D', text: '' },
];

const createEmptyQuestion = (order: number): Question => ({
  question_text: '',
  options: [
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' },
  ],
  correct_option: 'A',
  points: 100,
  time_limit_seconds: 30,
  question_order: order,
  explanation: '',
});

export const QuizEditorModal: React.FC<QuizEditorModalProps> = ({
  isOpen,
  quiz,
  hostSecret,
  onClose,
  onSaved,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([createEmptyQuestion(1)]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title || '');
      setDescription(quiz.description || '');
      if (quiz.questions && quiz.questions.length > 0) {
        setQuestions(
          quiz.questions.map((q, idx) => ({
            ...q,
            question_order: idx + 1,
            options: q.options || [...DEFAULT_OPTIONS],
          }))
        );
      } else {
        setQuestions([createEmptyQuestion(1)]);
      }
    } else {
      setTitle('');
      setDescription('');
      setQuestions([createEmptyQuestion(1)]);
    }
    setActiveIdx(0);
    setError(null);
  }, [quiz, isOpen]);

  if (!isOpen) return null;

  const currentQ = questions[activeIdx] || questions[0];

  const updateCurrentQuestion = (updates: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === activeIdx ? { ...q, ...updates } : q))
    );
  };

  const updateOptionText = (key: OptionKey, text: string) => {
    const updatedOptions = currentQ.options.map((opt) =>
      opt.key === key ? { ...opt, text } : opt
    );
    updateCurrentQuestion({ options: updatedOptions });
  };

  const handleAddQuestion = () => {
    const newQ = createEmptyQuestion(questions.length + 1);
    setQuestions((prev) => [...prev, newQ]);
    setActiveIdx(questions.length);
  };

  const handleDuplicateQuestion = (idx: number) => {
    const target = questions[idx];
    const duplicated: Question = {
      ...target,
      id: undefined,
      question_order: questions.length + 1,
      options: target.options.map((o) => ({ ...o })),
    };
    const nextList = [...questions];
    nextList.splice(idx + 1, 0, duplicated);
    setQuestions(nextList.map((q, i) => ({ ...q, question_order: i + 1 })));
    setActiveIdx(idx + 1);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      alert('Quiz must contain at least 1 question.');
      return;
    }
    const filtered = questions.filter((_, i) => i !== idx);
    const reordered = filtered.map((q, i) => ({ ...q, question_order: i + 1 }));
    setQuestions(reordered);
    setActiveIdx((prev) => (prev >= reordered.length ? reordered.length - 1 : prev));
  };

  const handleMove = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const list = [...questions];
    const [moved] = list.splice(idx, 1);
    list.splice(targetIdx, 0, moved);

    setQuestions(list.map((q, i) => ({ ...q, question_order: i + 1 })));
    setActiveIdx(targetIdx);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || title.trim().length < 3) {
      setError('Quiz Title must be at least 3 characters.');
      return;
    }

    // Validation
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim() || q.question_text.trim().length < 3) {
        setError(`Question #${i + 1} text is empty or too short.`);
        setActiveIdx(i);
        return;
      }
      for (const opt of q.options) {
        if (!opt.text.trim()) {
          setError(`Question #${i + 1} option [${opt.key}] cannot be empty.`);
          setActiveIdx(i);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const quizPayload: Quiz = {
        id: quiz?.id,
        title: title.trim(),
        description: description.trim(),
        status: 'published',
        questions: questions.map((q, idx) => ({
          ...q,
          question_order: idx + 1,
        })),
      };

      const saved = await saveQuiz(quizPayload, hostSecret);
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save quiz to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] glass-panel rounded-3xl border border-brand-border/80 shadow-2xl flex flex-col overflow-hidden bg-brand-dark/95">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-brand-border/70 flex items-center justify-between shrink-0 bg-brand-surface/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-cyan/20 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
                {quiz ? 'Edit Quiz' : 'Create Dynamic Quiz'}
              </h2>
              <p className="text-xs text-slate-400">
                Configure custom questions, 4 options, points, and timers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-brand-surface hover:bg-brand-surface/80 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-brand-rose/15 border border-brand-rose/40 text-brand-rose text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quiz Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Quiz Title <span className="text-brand-rose">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Next-Gen Cloud Architecture Quiz"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-brand-navy border border-brand-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Description
              </label>
              <input
                type="text"
                placeholder="e.g. 10 questions for workshop rehearsal"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-brand-navy border border-brand-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
              />
            </div>
          </div>

          {/* Question Navigator Pills */}
          <div className="border-t border-brand-border/60 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Questions ({questions.length})
              </span>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan text-xs font-bold hover:bg-brand-cyan/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {questions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                    activeIdx === idx
                      ? 'bg-brand-cyan text-brand-dark border-brand-cyan shadow-md'
                      : 'bg-brand-surface/60 text-slate-300 border-brand-border hover:bg-brand-surface'
                  }`}
                >
                  Q{idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Active Question Editor Card */}
          {currentQ && (
            <div className="glass-card p-5 rounded-2xl border border-brand-border space-y-5 bg-brand-surface/30">
              {/* Question Header & Order Controls */}
              <div className="flex items-center justify-between border-b border-brand-border/40 pb-3">
                <span className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-brand-violet text-white text-xs flex items-center justify-center font-mono">
                    {activeIdx + 1}
                  </span>
                  Question Details
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMove(activeIdx, 'up')}
                    disabled={activeIdx === 0}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                    title="Move Up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(activeIdx, 'down')}
                    disabled={activeIdx === questions.length - 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                    title="Move Down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateQuestion(activeIdx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-cyan"
                    title="Duplicate Question"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(activeIdx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-rose"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Question Text <span className="text-brand-rose">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter your question text here..."
                  value={currentQ.question_text}
                  onChange={(e) => updateCurrentQuestion({ question_text: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-brand-navy border border-brand-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                  required
                />
              </div>

              {/* 4 Answer Options */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Answer Options (Select correct answer on the right)</span>
                  <span className="text-[11px] text-brand-cyan font-normal">
                    Click radio to set correct answer
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQ.options.map((opt) => {
                    const isCorrect = currentQ.correct_option === opt.key;

                    let badgeColor = 'bg-brand-surface text-slate-300';
                    if (opt.key === 'A') badgeColor = 'bg-brand-violet text-white';
                    if (opt.key === 'B') badgeColor = 'bg-brand-cyan text-brand-dark';
                    if (opt.key === 'C') badgeColor = 'bg-brand-emerald text-white';
                    if (opt.key === 'D') badgeColor = 'bg-brand-amber text-brand-dark';

                    return (
                      <div
                        key={opt.key}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                          isCorrect
                            ? 'bg-brand-emerald/15 border-brand-emerald shadow-sm'
                            : 'bg-brand-navy/80 border-brand-border'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${badgeColor}`}>
                          {opt.key}
                        </span>

                        <input
                          type="text"
                          placeholder={`Option ${opt.key} text`}
                          value={opt.text}
                          onChange={(e) => updateOptionText(opt.key, e.target.value)}
                          className="flex-1 bg-transparent border-none text-white text-xs sm:text-sm focus:outline-none"
                          required
                        />

                        <button
                          type="button"
                          onClick={() => updateCurrentQuestion({ correct_option: opt.key })}
                          className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${
                            isCorrect
                              ? 'text-brand-emerald bg-brand-emerald/20'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                          title={isCorrect ? 'Correct Option' : 'Mark as Correct'}
                        >
                          <CheckCircle2 className={`w-5 h-5 ${isCorrect ? 'fill-brand-emerald/30' : ''}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Timing, Points & Explanation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Time Limit */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-brand-cyan" /> Time Limit (Seconds)
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[10, 15, 20, 25, 30, 45, 60].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => updateCurrentQuestion({ time_limit_seconds: sec })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                          currentQ.time_limit_seconds === sec
                            ? 'bg-brand-cyan text-brand-dark'
                            : 'bg-brand-surface text-slate-300 border border-brand-border/60 hover:bg-brand-surface/80'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Points */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-brand-amber" /> Points
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[50, 100, 200, 500].map((pts) => (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => updateCurrentQuestion({ points: pts })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                          currentQ.points === pts
                            ? 'bg-brand-amber text-brand-dark'
                            : 'bg-brand-surface text-slate-300 border border-brand-border/60 hover:bg-brand-surface/80'
                        }`}
                      >
                        {pts} pts
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Explanation Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-brand-cyan" /> Educational Explanation
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain why this answer is correct (revealed to students after question closes)..."
                  value={currentQ.explanation || ''}
                  onChange={(e) => updateCurrentQuestion({ explanation: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-brand-navy border border-brand-border text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-brand-border/70 flex items-center justify-between shrink-0 bg-brand-surface/40">
          <div className="text-xs text-slate-400">
            {questions.length} question{questions.length === 1 ? '' : 's'} configured
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-brand-surface hover:bg-brand-surface/80 text-slate-300 text-xs font-bold transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-violet to-brand-cyan text-white text-xs sm:text-sm font-bold flex items-center gap-2 hover:opacity-95 shadow-md shadow-brand-violet/25 disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving to Database...' : 'Save & Publish Quiz'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
