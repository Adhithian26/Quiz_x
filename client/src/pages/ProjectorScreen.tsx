import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSocket } from '../services/socket';
import { QRCodeSVG } from 'qrcode.react';
import { Timer } from '../components/Timer';
import { Podium } from '../components/Podium';
import { Leaderboard } from '../components/Leaderboard';
import {
  PublicQuestion,
  SessionStatus,
  OptionKey,
  LeaderboardEntry,
  SessionCountsPayload,
  QuestionStats
} from '@quizx/shared';
import {
  Maximize,
  Minimize,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Trophy,
  HelpCircle,
  Zap,
  Radio
} from 'lucide-react';

export const ProjectorScreen: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const socket = getSocket();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('waiting');
  const [counts, setCounts] = useState<SessionCountsPayload>({ joinedCount: 0, connectedCount: 0, submittedCount: 0 });
  const [currentQuestion, setCurrentQuestion] = useState<PublicQuestion | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [finalPodium, setFinalPodium] = useState<LeaderboardEntry[]>([]);
  const [revealData, setRevealData] = useState<{
    correctOption: OptionKey;
    explanation: string;
    stats: QuestionStats;
  } | null>(null);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    if (!roomCode) return;

    const joinRoom = () => {
      socket.emit('projector:join', { roomCode: roomCode.toUpperCase() }, (res: any) => {
        if (res && res.success) {
          setSessionStatus(res.status || 'waiting');
          if (res.counts) setCounts(res.counts);
          if (res.currentQuestion) setCurrentQuestion(res.currentQuestion);
          if (res.leaderboard) setLeaderboard(res.leaderboard);
        }
      });
    };

    if (socket.connected) {
      joinRoom();
    }
    socket.on('connect', joinRoom);

    socket.on('counts:update', (updatedCounts: SessionCountsPayload) => {
      setCounts(updatedCounts);
    });

    socket.on('question:started', ({ question }: { question: PublicQuestion; deadline: number }) => {
      setCurrentQuestion(question);
      setSessionStatus('question_active');
      setRevealData(null);
    });

    socket.on('question:closed', () => {
      setSessionStatus('question_closed');
    });

    socket.on('question:revealed', (data: any) => {
      setSessionStatus('question_revealed');
      setRevealData({
        correctOption: data.correctOption,
        explanation: data.explanation,
        stats: data.stats
      });
    });

    socket.on('leaderboard:update', ({ leaderboard }: { leaderboard: LeaderboardEntry[] }) => {
      setSessionStatus('leaderboard');
      setLeaderboard(leaderboard);
    });

    socket.on('session:finished', ({ leaderboard, podium }: { leaderboard: LeaderboardEntry[]; podium: LeaderboardEntry[] }) => {
      setSessionStatus('finished');
      setLeaderboard(leaderboard);
      setFinalPodium(podium);
    });

    return () => {
      socket.off('connect', joinRoom);
      socket.off('counts:update');
      socket.off('question:started');
      socket.off('question:closed');
      socket.off('question:revealed');
      socket.off('leaderboard:update');
      socket.off('session:finished');
    };
  }, [socket, roomCode]);

  const studentJoinUrl = roomCode
    ? `${window.location.origin}/join?room=${roomCode.toUpperCase()}`
    : '';

  const getOptionBadgeColor = (key: OptionKey) => {
    switch (key) {
      case 'A': return 'bg-brand-violet text-white';
      case 'B': return 'bg-brand-cyan text-brand-dark';
      case 'C': return 'bg-brand-emerald text-white';
      case 'D': return 'bg-brand-amber text-brand-dark';
    }
  };

  const cleanRoomCode = (roomCode || '').toUpperCase();
  const submissionPercent = counts.connectedCount > 0
    ? Math.min(100, Math.round((counts.submittedCount / counts.connectedCount) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-brand-dark text-white flex flex-col p-6 sm:p-10 select-none overflow-hidden">
      {/* Presentation Header */}
      <header className="flex items-center justify-between pb-6 border-b border-brand-border/60">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-violet to-brand-cyan flex items-center justify-center shadow-lg">
            <Zap className="w-7 h-7 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight">
              Quiz<span className="text-brand-cyan">X</span> Live Arena
            </h1>
            <span className="text-xs text-slate-400 font-medium">Auditorium Projector Display</span>
          </div>
        </div>

        {/* Room Code Banner & Stats */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 bg-brand-surface/80 border border-brand-border px-5 py-2.5 rounded-2xl">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-violet" />
              <span className="font-mono font-extrabold text-xl sm:text-2xl text-white">{counts.joinedCount}</span>
              <span className="text-xs text-slate-400 uppercase font-semibold">Joined</span>
            </div>

            <div className="w-px h-6 bg-brand-border" />

            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-brand-emerald animate-pulse" />
              <span className="font-mono font-extrabold text-xl sm:text-2xl text-brand-emerald">{counts.connectedCount}</span>
              <span className="text-xs text-slate-400 uppercase font-semibold">Live</span>
            </div>
          </div>

          <div className="bg-brand-cyan/15 border-2 border-brand-cyan/40 px-6 py-2 rounded-2xl flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-brand-cyan font-bold">ROOM CODE:</span>
            <span className="font-mono font-extrabold text-2xl sm:text-3xl tracking-widest text-white">{cleanRoomCode}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-3 rounded-2xl bg-brand-surface border border-brand-border hover:bg-brand-surface/80 text-slate-300 hover:text-white transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Auditorium Viewport */}
      <main className="flex-1 flex flex-col justify-center py-6">
        {/* ==================================================== */}
        {/* VIEW 1: WAITING ROOM & GIANT QR CODE                 */}
        {/* ==================================================== */}
        {sessionStatus === 'waiting' && (
          <div className="max-w-4xl mx-auto w-full glass-panel p-10 sm:p-14 rounded-3xl border border-brand-border/80 text-center shadow-2xl animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan text-sm font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-4 h-4" /> Join Using Your Mobile Phone
            </div>

            <h2 className="text-4xl sm:text-5xl font-black font-display mb-3">
              Scan the QR Code to Play
            </h2>
            <p className="text-lg text-slate-300 mb-8">
              Open your phone camera, scan the code, or go to <span className="font-mono text-brand-cyan font-bold">{studentJoinUrl}</span>
            </p>

            <div className="p-6 bg-white rounded-3xl inline-block shadow-2xl mb-8">
              <QRCodeSVG value={studentJoinUrl} size={260} />
            </div>

            <div className="flex items-center justify-center gap-8">
              <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-brand-navy border border-brand-border">
                <span className="w-3.5 h-3.5 rounded-full bg-brand-emerald animate-pulse" />
                <span className="font-display font-extrabold text-xl text-white">
                  {counts.joinedCount} Students Connected
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 2: ACTIVE QUESTION SCREEN                       */}
        {/* ==================================================== */}
        {(sessionStatus === 'question_active' || sessionStatus === 'question_closed') && currentQuestion && (
          <div className="max-w-6xl mx-auto w-full space-y-8 animate-fade-in">
            {/* Top Bar: Question # & Giant Timer & Submission Bar */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold uppercase tracking-wider text-brand-cyan">
                  Question {currentQuestion.question_order} of {currentQuestion.total_questions}
                </span>
                <span className="ml-3 px-2.5 py-1 rounded-md bg-brand-surface border border-brand-border text-xs font-mono font-bold text-slate-300">
                  {currentQuestion.points} points
                </span>
              </div>

              {sessionStatus === 'question_active' ? (
                <Timer
                  deadlineTimestamp={currentQuestion.deadline_timestamp}
                  totalSeconds={currentQuestion.time_limit_seconds}
                  size="large"
                />
              ) : (
                <div className="px-6 py-2.5 rounded-2xl bg-brand-amber/20 border border-brand-amber text-brand-amber font-display font-extrabold text-xl">
                  Time's Up!
                </div>
              )}
            </div>

            {/* Giant Question Text */}
            <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-brand-border shadow-xl">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight font-display">
                {currentQuestion.question_text}
              </h2>
            </div>

            {/* Live Response Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-400">
                <span>Responses Submitted</span>
                <span className="font-mono text-brand-cyan">
                  {counts.submittedCount} / {counts.connectedCount} ({submissionPercent}%)
                </span>
              </div>
              <div className="w-full h-3.5 rounded-full bg-brand-surface border border-brand-border overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-violet to-brand-cyan transition-all duration-300 rounded-full"
                  style={{ width: `${submissionPercent}%` }}
                />
              </div>
            </div>

            {/* 4 Large Option Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              {currentQuestion.options.map((opt) => {
                const badgeColor = getOptionBadgeColor(opt.key);
                return (
                  <div
                    key={opt.key}
                    className="glass-card p-6 rounded-2xl border-2 border-brand-border/80 flex items-center gap-5 shadow-lg"
                  >
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-xl shrink-0 shadow-md ${badgeColor}`}>
                      {opt.key}
                    </span>
                    <span className="text-lg sm:text-xl font-bold text-slate-100 leading-snug">
                      {opt.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 3: QUESTION REVEAL SCREEN                       */}
        {/* ==================================================== */}
        {sessionStatus === 'question_revealed' && currentQuestion && revealData && (
          <div className="max-w-6xl mx-auto w-full space-y-8 animate-slide-up">
            <div className="text-center">
              <span className="text-xs font-bold text-brand-emerald uppercase tracking-wider mb-1 block">
                Official Correct Answer
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">
                {currentQuestion.question_text}
              </h2>
            </div>

            {/* 4 Options with Distribution Bars & Highlight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {currentQuestion.options.map((opt) => {
                const isCorrect = opt.key === revealData.correctOption;
                const count = revealData.stats.optionCounts[opt.key] || 0;
                const total = revealData.stats.totalAnswers || 1;
                const percent = Math.round((count / total) * 100);

                return (
                  <div
                    key={opt.key}
                    className={`p-6 rounded-2xl border-2 transition-all relative overflow-hidden ${
                      isCorrect
                        ? 'bg-brand-emerald/20 border-brand-emerald shadow-xl shadow-brand-emerald/20'
                        : 'glass-card border-brand-border/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3 relative z-10">
                      <div className="flex items-center gap-4">
                        <span
                          className={`w-10 h-10 rounded-xl font-extrabold text-base flex items-center justify-center ${
                            isCorrect ? 'bg-brand-emerald text-white' : 'bg-brand-surface text-slate-300'
                          }`}
                        >
                          {opt.key}
                        </span>
                        <span className="text-lg font-bold text-white leading-snug">{opt.text}</span>
                      </div>
                      {isCorrect && <CheckCircle2 className="w-8 h-8 text-brand-emerald shrink-0" />}
                    </div>

                    {/* Distribution Bar */}
                    <div className="relative z-10 mt-3 pt-3 border-t border-brand-border/40 flex items-center justify-between text-xs font-mono font-bold text-slate-300">
                      <span>{count} votes</span>
                      <span>{percent}%</span>
                    </div>

                    <div
                      className={`absolute bottom-0 left-0 h-1.5 transition-all duration-500 ${
                        isCorrect ? 'bg-brand-emerald' : 'bg-slate-600'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Explanation Card */}
            {revealData.explanation && (
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-brand-border">
                <div className="flex items-center gap-2 text-brand-cyan text-sm font-bold uppercase tracking-wider mb-2">
                  <HelpCircle className="w-5 h-5" /> Detailed Explanation
                </div>
                <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-normal">
                  {revealData.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 4: LIVE LEADERBOARD                             */}
        {/* ==================================================== */}
        {sessionStatus === 'leaderboard' && (
          <div className="max-w-4xl mx-auto w-full glass-panel p-8 sm:p-12 rounded-3xl border border-brand-border shadow-2xl animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-amber/20 border border-brand-amber/40 text-brand-amber text-xs font-bold uppercase tracking-wider mb-2">
                <Trophy className="w-4 h-4" /> Live Standings
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white font-display">
                Leaderboard Arena
              </h2>
            </div>

            <Leaderboard entries={leaderboard} maxDisplay={8} />
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 5: GRAND PODIUM & FINISHED                      */}
        {/* ==================================================== */}
        {sessionStatus === 'finished' && (
          <div className="max-w-5xl mx-auto w-full space-y-8 animate-fade-in">
            <Podium podium={finalPodium.length > 0 ? finalPodium : leaderboard.slice(0, 3)} triggerConfetti={true} />

            <div className="glass-panel p-8 rounded-3xl border border-brand-border">
              <h3 className="text-xl font-bold text-white font-display text-center mb-6">
                Top Performers Ranking
              </h3>
              <Leaderboard entries={leaderboard} maxDisplay={10} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
