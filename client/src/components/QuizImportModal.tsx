import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  FileCode,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Info
} from 'lucide-react';
import { parseQuizInput, SAMPLE_QUIZ_TEMPLATE, ParsedQuizResult } from '../utils/quizParser';

interface QuizImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (result: ParsedQuizResult, mode: 'replace' | 'append') => void;
}

export const QuizImportModal: React.FC<QuizImportModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParsedQuizResult | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (text.trim().length > 10) {
      const res = parseQuizInput(text);
      setParseResult(res);
    } else {
      setParseResult(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);
      const res = parseQuizInput(content);
      setParseResult(res);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setFileName(null);
    handleTextChange(SAMPLE_QUIZ_TEMPLATE);
  };

  const handleConfirmImport = () => {
    if (!parseResult || parseResult.questions.length === 0) return;
    onImport(parseResult, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl glass-panel rounded-3xl border border-brand-border/90 shadow-2xl flex flex-col overflow-hidden bg-brand-dark/95">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-brand-border/70 flex items-center justify-between shrink-0 bg-brand-surface/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-cyan/20 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
                Import Quiz from Text / File
              </h2>
              <p className="text-xs text-slate-400">
                Upload or paste a plain text document, Markdown, CSV, or JSON
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* File Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-brand-border hover:border-brand-cyan/60 rounded-2xl p-4 sm:p-6 text-center cursor-pointer transition-all bg-brand-surface/20 hover:bg-brand-surface/40 group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.md,.json,.csv"
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-brand-navy border border-brand-border flex items-center justify-center text-slate-400 group-hover:text-brand-cyan group-hover:scale-105 transition-all">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {fileName ? (
                    <span className="text-brand-cyan">Loaded: {fileName}</span>
                  ) : (
                    'Click to upload or drag & drop text file'
                  )}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Supports .txt, .md (Markdown), .csv, and .json
                </p>
              </div>
            </div>
          </div>

          {/* Or Paste Direct Text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-brand-cyan" /> Or Paste Raw Text
              </label>
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-xs text-brand-cyan hover:underline font-semibold flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" /> Load Sample Format
              </button>
            </div>

            <textarea
              rows={8}
              value={inputText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={`Q1: What is the capital of France?\nA) Berlin\nB) Madrid\nC) Paris\nD) Rome\nAnswer: C\nExplanation: Paris is the capital.`}
              className="w-full px-4 py-3 rounded-xl bg-brand-navy border border-brand-border text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-cyan resize-y"
            />
          </div>

          {/* Parse Result Summary */}
          {parseResult && (
            <div className="p-4 rounded-2xl bg-brand-surface/40 border border-brand-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-emerald" />
                  <span className="text-xs font-bold text-white">
                    Parsed <span className="text-brand-cyan font-mono">{parseResult.questions.length}</span> question{parseResult.questions.length === 1 ? '' : 's'}
                  </span>
                  {parseResult.title && (
                    <span className="text-xs text-slate-400 truncate max-w-xs">
                      • Title: <strong className="text-white">{parseResult.title}</strong>
                    </span>
                  )}
                </div>

                {/* Import Mode Selector */}
                <div className="flex items-center gap-1.5 bg-brand-navy p-1 rounded-xl border border-brand-border text-xs">
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      importMode === 'replace'
                        ? 'bg-brand-cyan text-brand-dark'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Replace All
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('append')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      importMode === 'append'
                        ? 'bg-brand-cyan text-brand-dark'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Append to Existing
                  </button>
                </div>
              </div>

              {/* Warnings if any */}
              {parseResult.warnings.length > 0 && (
                <div className="space-y-1 pt-1">
                  {parseResult.warnings.slice(0, 3).map((w, idx) => (
                    <div
                      key={idx}
                      className="text-[11px] text-brand-amber flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Format Guide */}
          <div className="p-3.5 rounded-xl bg-brand-navy/60 border border-brand-border/60 text-xs text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-brand-cyan" /> Supported Format Tips:
            </div>
            <p>
              • Use <code className="text-brand-cyan">Q1:</code> or <code className="text-brand-cyan">1.</code> for questions.
            </p>
            <p>
              • Use <code className="text-brand-cyan">A)</code>, <code className="text-brand-cyan">B)</code>, <code className="text-brand-cyan">C)</code>, <code className="text-brand-cyan">D)</code> for options.
            </p>
            <p>
              • Use <code className="text-brand-cyan">Answer: [A-D]</code> to mark the correct choice and <code className="text-brand-cyan">Explanation: ...</code> for explanations.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-brand-border/70 flex items-center justify-between shrink-0 bg-brand-surface/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-brand-surface hover:bg-brand-surface/80 text-slate-300 text-xs font-bold transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!parseResult || parseResult.questions.length === 0}
            onClick={handleConfirmImport}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-violet text-brand-dark font-extrabold text-xs sm:text-sm flex items-center gap-2 hover:opacity-95 shadow-md shadow-brand-cyan/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <CheckCircle2 className="w-4 h-4 text-brand-dark" />
            Import {parseResult ? `${parseResult.questions.length} Questions` : 'Questions'}
          </button>
        </div>
      </div>
    </div>
  );
};

