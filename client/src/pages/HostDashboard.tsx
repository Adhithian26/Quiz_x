import React, { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../services/socket';
import { fetchQuizzes, verifyHostSecret, getExportCsvUrl } from '../services/api';
import { Navbar } from '../components/Navbar';
import { Leaderboard } from '../components/Leaderboard';
import { QRCodeSVG } from 'qrcode.react';
import {
  Quiz,
  Question,
  SessionStatus,
  LeaderboardEntry,
  SessionCountsPayload,
  QuestionStats
} from '@quizx/shared';
import {
  Shield,
  Play,
  CheckCircle,
  Users,
  Eye,
  Trophy,
  Download,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Radio,
  FileSpreadsheet,
  Check,
  X,
  RefreshCw,
  Clock
} from 'lucide-react';

export const HostDashboard: React.FC = () => {
  const socket = getSocket();

  // Authentication State
  const [hostSecret, setHostSecret] = useState<string>(() => sessionStorage.getItem('quizx_hostSecret') || 'quizx-host-2026');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Quizzes State
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [loadingQuizzes, setLoadingQuizzes] = useState<boolean>(true);

  // Live Session State
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('waiting');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(-1);
  const [counts, setCounts] = useState<SessionCountsPayload>({ joinedCount: 0, connectedCount: 0, submittedCount: 0 });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [revealStats, setRevealStats] = useState<QuestionStats | null>(null);
  const [correctOption, setCorrectOption] = useState<string | null>(null);

  // Authenticate host
  const handleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);

    const valid = await verifyHostSecret(hostSecret);
    if (!valid) {
      setAuthError('Invalid host secret key');
      return;
    }

    sessionStorage.setItem('quizx_hostSecret', hostSecret);
    socket.emit('host:auth', { hostSecret }, (res: any) => {
      if (res && res.success) {
        setIsAuthenticated(true);
        loadQuizzes();
      } else {
        setAuthError(res?.message || 'Host socket authentication failed');
      }
    });
  };

  const loadQuizzes = async () => {
    setLoadingQuizzes(true);
    try {
      const list = await fetchQuizzes();
      setQuizzes(list);
      if (list.length > 0 && !selectedQuiz) {
        setSelectedQuiz(list[0]);
      }
    } catch (err: any) {
      console.error('Error fetching quizzes:', err);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  useEffect(() => {
    if (hostSecret) {
      handleAuth();
    }
  }, []);

  // Listen to socket updates
  useEffect(() => {
    if (!socket) return;

    socket.on('counts:update', (updatedCounts: SessionCountsPayload) => {
      setCounts(updatedCounts);
    });

    socket.on('leaderboard:update', ({ leaderboard }: { leaderboard: LeaderboardEntry[] }) => {
      setLeaderboard(leaderboard);
    });

    return () => {
      socket.off('counts:update');
      socket.off('leaderboard:update');
    };
  }, [socket]);

  // Create & Launch Session
  const handleCreateSession = () => {
    if (!selectedQuiz) return;

    socket.emit('host:create_session', { quizId: selectedQuiz.id }, (res: any) => {
      if (res && res.success) {
        setRoomCode(res.roomCode);
        setSessionId(res.session.id);
        setSessionStatus('waiting');
        setCurrentQuestionIndex(-1);
        setCounts({ joinedCount: 0, connectedCount: 0, submittedCount: 0 });
        setRevealStats(null);
        setCorrectOption(null);
      } else {
        alert(res?.message || 'Failed to start quiz session');
      }
    });
  };

  // Start Next Question
  const handleStartQuestion = (idx?: number) => {
    if (!roomCode || !selectedQuiz) return;
    const targetIdx = idx !== undefined ? idx : currentQuestionIndex + 1;

    socket.emit('host:start_question', { roomCode, questionIndex: targetIdx }, (res: any) => {
      if (res && res.success) {
        setCurrentQuestionIndex(targetIdx);
        setSessionStatus('question_active');
        setRevealStats(null);
        setCorrectOption(null);
      } else {
        alert(res?.message || 'Error starting question');
      }
    });
  };

  // Close Question
  const handleCloseQuestion = () => {
    if (!roomCode) return;
    socket.emit('host:close_question', { roomCode }, (res: any) => {
      if (res && res.success) {
        setSessionStatus('question_closed');
      }
    });
  };

  // Reveal Answer
  const handleRevealAnswer = () => {
    if (!roomCode) return;
    socket.emit('host:reveal_answer', { roomCode }, (res: any) => {
      if (res && res.success) {
        setSessionStatus('question_revealed');
        setCorrectOption(res.correctOption);
        setRevealStats(res.stats);
      }
    });
  };

  // Show Leaderboard
  const handleShowLeaderboard = () => {
    if (!roomCode) return;
    socket.emit('host:show_leaderboard', { roomCode }, (res: any) => {
      if (res && res.success) {
        setSessionStatus('leaderboard');
        setLeaderboard(res.leaderboard);
      }
    });
  };

  // End Quiz
  const handleEndQuiz = () => {
    if (!roomCode) return;
    if (!confirm('Are you sure you want to end the quiz and show final podium results?')) return;

    socket.emit('host:end_quiz', { roomCode }, (res: any) => {
      if (res && res.success) {
        setSessionStatus('finished');
        setLeaderboard(res.result.leaderboard);
      }
    });
  };

  const studentJoinUrl = roomCode
    ? `${window.location.origin}/join?room=${roomCode}`
    : '';

  const questions = selectedQuiz?.questions || [];
  const currentQuestion: Question | undefined = questions[currentQuestionIndex];

  // Passcode login modal if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-brand-border text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-brand-violet/20 border border-brand-violet/40 flex items-center justify-center text-brand-violet-glow mx-auto mb-4">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-extrabold text-white font-display mb-1">
              Host Control Access
            </h1>
            <p className="text-xs text-slate-400 mb-6">
              Enter host passcode to manage quizzes and control live sessions
            </p>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-brand-rose/15 border border-brand-rose/30 flex items-center gap-2 text-brand-rose text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="Host Secret Key"
                  value={hostSecret}
                  onChange={(e) => setHostSecret(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-brand-navy border border-brand-border text-white text-center font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-violet"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-brand-violet hover:bg-brand-violet/90 text-white font-bold text-sm tracking-wide shadow-lg shadow-brand-violet/25 transition-all"
              >
                Unlock Host Portal
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Navbar roomCode={roomCode || undefined} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-brand-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-emerald animate-pulse" />
              <h1 className="text-xl sm:text-2xl font-extrabold text-white font-display">
                Host Control Center
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Authoritative controller for real-time quiz lifecycles
            </p>
          </div>

          <div className="flex items-center gap-3">
            {roomCode && (
              <>
                <a
                  href={`/projector/${roomCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-surface border border-brand-border text-xs sm:text-sm font-semibold text-brand-cyan hover:bg-brand-surface/80 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Projector View
                </a>

                {sessionId && (
                  <a
                    href={getExportCsvUrl(sessionId)}
                    download
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-emerald/20 border border-brand-emerald/40 text-xs sm:text-sm font-semibold text-brand-emerald hover:bg-brand-emerald/30 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </a>
                )}
              </>
            )}
          </div>
        </div>

        {/* ==================================================== */}
        {/* ACTIVE SESSION CONTROL VIEW                          */}
        {/* ==================================================== */}
        {roomCode ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Cols: Live Question Flow & Controls */}
            <div className="lg:col-span-8 space-y-6">
              {/* Live Metric Cards: Joined, Connected, Submitted */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="glass-card p-4 rounded-2xl border border-brand-border">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase mb-1">
                    <Users className="w-4 h-4 text-brand-violet" /> Joined
                  </div>
                  <div className="font-mono font-extrabold text-2xl sm:text-3xl text-white">
                    {counts.joinedCount}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Total registered</div>
                </div>

                <div className="glass-card p-4 rounded-2xl border border-brand-border">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase mb-1">
                    <Radio className="w-4 h-4 text-brand-emerald animate-pulse" /> Connected
                  </div>
                  <div className="font-mono font-extrabold text-2xl sm:text-3xl text-brand-emerald">
                    {counts.connectedCount}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Live web sockets</div>
                </div>

                <div className="glass-card p-4 rounded-2xl border border-brand-border">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase mb-1">
                    <CheckCircle className="w-4 h-4 text-brand-cyan" /> Submitted
                  </div>
                  <div className="font-mono font-extrabold text-2xl sm:text-3xl text-brand-cyan">
                    {counts.submittedCount}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Current responses</div>
                </div>
              </div>

              {/* Action Control Toolbar */}
              <div className="glass-panel p-5 rounded-2xl border border-brand-border space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Status:</span>
                    <span className="px-2.5 py-1 rounded-full bg-brand-violet/20 border border-brand-violet/40 text-brand-violet-glow text-xs font-bold uppercase font-mono">
                      {sessionStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 font-mono">
                    Question: {currentQuestionIndex + 1} / {questions.length}
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {sessionStatus === 'waiting' && (
                    <button
                      onClick={() => handleStartQuestion(0)}
                      className="px-5 py-3 rounded-xl bg-brand-cyan text-brand-dark font-extrabold text-sm flex items-center gap-2 hover:opacity-90 shadow-md shadow-brand-cyan/20 transition-all"
                    >
                      <Play className="w-4 h-4 fill-brand-dark" />
                      Start Question 1
                    </button>
                  )}

                  {sessionStatus === 'question_active' && (
                    <button
                      onClick={handleCloseQuestion}
                      className="px-5 py-3 rounded-xl bg-brand-amber text-brand-dark font-extrabold text-sm flex items-center gap-2 hover:opacity-90 shadow-md transition-all"
                    >
                      <Clock className="w-4 h-4" />
                      Close Question Early
                    </button>
                  )}

                  {(sessionStatus === 'question_closed' || sessionStatus === 'question_active') && (
                    <button
                      onClick={handleRevealAnswer}
                      className="px-5 py-3 rounded-xl bg-brand-emerald text-white font-extrabold text-sm flex items-center gap-2 hover:opacity-90 shadow-md shadow-brand-emerald/20 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      Reveal Correct Answer
                    </button>
                  )}

                  {sessionStatus === 'question_revealed' && (
                    <button
                      onClick={handleShowLeaderboard}
                      className="px-5 py-3 rounded-xl bg-brand-violet text-white font-extrabold text-sm flex items-center gap-2 hover:opacity-90 shadow-md shadow-brand-violet/20 transition-all"
                    >
                      <Trophy className="w-4 h-4" />
                      Show Live Leaderboard
                    </button>
                  )}

                  {sessionStatus === 'leaderboard' && currentQuestionIndex < questions.length - 1 && (
                    <button
                      onClick={() => handleStartQuestion()}
                      className="px-5 py-3 rounded-xl bg-brand-cyan text-brand-dark font-extrabold text-sm flex items-center gap-2 hover:opacity-90 shadow-md shadow-brand-cyan/20 transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                      Launch Question {currentQuestionIndex + 2}
                    </button>
                  )}

                  {currentQuestionIndex >= questions.length - 1 && sessionStatus !== 'finished' && (
                    <button
                      onClick={handleEndQuiz}
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-brand-violet to-brand-rose text-white font-extrabold text-sm flex items-center gap-2 hover:opacity-90 shadow-md transition-all"
                    >
                      <Trophy className="w-4 h-4" />
                      End Quiz & Announce Winners
                    </button>
                  )}

                  <button
                    onClick={handleEndQuiz}
                    className="ml-auto px-4 py-2 rounded-xl bg-brand-surface border border-brand-border text-slate-400 hover:text-brand-rose text-xs font-semibold transition-colors"
                  >
                    Finish Session
                  </button>
                </div>
              </div>

              {/* Current Question Inspector */}
              {currentQuestion && (
                <div className="glass-panel p-6 rounded-2xl border border-brand-border space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider">
                      Question {currentQuestion.question_order}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {currentQuestion.time_limit_seconds}s limit • {currentQuestion.points} pts
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white leading-relaxed">
                    {currentQuestion.question_text}
                  </h3>

                  {/* 4 Options Display */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {currentQuestion.options.map((opt) => {
                      const isCorrect = opt.key === currentQuestion.correct_option;
                      const count = revealStats?.optionCounts[opt.key] || 0;

                      return (
                        <div
                          key={opt.key}
                          className={`p-3.5 rounded-xl border flex items-center justify-between ${
                            isCorrect
                              ? 'bg-brand-emerald/15 border-brand-emerald/60 text-white'
                              : 'bg-brand-surface/40 border-brand-border/60 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                                isCorrect ? 'bg-brand-emerald text-white' : 'bg-brand-surface text-slate-300'
                              }`}
                            >
                              {opt.key}
                            </span>
                            <span className="text-xs font-medium truncate">{opt.text}</span>
                          </div>
                          {revealStats && (
                            <span className="font-mono text-xs font-bold text-slate-400 ml-2">
                              {count}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {currentQuestion.explanation && (
                    <div className="p-3.5 rounded-xl bg-brand-navy/60 border border-brand-border/60 text-xs text-slate-300 leading-relaxed">
                      <span className="font-bold text-brand-cyan">Explanation: </span>
                      {currentQuestion.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right 4 Cols: QR Code, Join Info, Live Leaderboard */}
            <div className="lg:col-span-4 space-y-6">
              {/* QR Code & Join Box */}
              <div className="glass-panel p-6 rounded-3xl border border-brand-border text-center shadow-lg">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Room Join Code
                </span>
                <span className="font-mono font-extrabold text-4xl text-brand-cyan tracking-widest block mb-4">
                  {roomCode}
                </span>

                <div className="p-4 bg-white rounded-2xl inline-block shadow-md mb-4">
                  <QRCodeSVG value={studentJoinUrl} size={160} />
                </div>

                <div className="text-xs text-slate-400 break-all px-2 font-mono">
                  {studentJoinUrl}
                </div>
              </div>

              {/* Real-Time Mini Leaderboard */}
              <div className="glass-panel p-5 rounded-2xl border border-brand-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-white font-display">
                    <Trophy className="w-4 h-4 text-brand-amber" /> Live Standings
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {leaderboard.length} ranked
                  </span>
                </div>

                <Leaderboard entries={leaderboard} maxDisplay={5} />
              </div>
            </div>
          </div>
        ) : (
          /* ==================================================== */
          /* NO ACTIVE SESSION: QUIZ SELECTOR & LAUNCHER          */
          /* ==================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <div className="glass-panel p-6 rounded-3xl border border-brand-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white font-display">Available Quizzes</h2>
                    <p className="text-xs text-slate-400">Select a quiz to launch in the arena</p>
                  </div>
                  <button
                    onClick={loadQuizzes}
                    className="p-2 rounded-xl bg-brand-surface text-slate-300 hover:text-white hover:bg-brand-surface/80"
                    title="Refresh quizzes"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {loadingQuizzes ? (
                  <div className="py-8 text-center text-slate-500 text-sm">Loading quizzes...</div>
                ) : (
                  <div className="space-y-3">
                    {quizzes.map((q) => {
                      const isSelected = selectedQuiz?.id === q.id;
                      return (
                        <div
                          key={q.id}
                          onClick={() => setSelectedQuiz(q)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-brand-violet/20 border-brand-violet shadow-md'
                              : 'bg-brand-surface/30 border-brand-border/60 hover:border-brand-border'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-base text-white">{q.title}</h3>
                            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-brand-cyan">
                              {(q.questions || []).length} questions
                            </span>
                          </div>
                          {q.description && (
                            <p className="text-xs text-slate-300 mt-1 line-clamp-2">{q.description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Launch Card */}
            <div className="lg:col-span-5">
              <div className="glass-panel p-8 rounded-3xl border border-brand-border text-center space-y-6 shadow-2xl">
                <div className="w-16 h-16 rounded-3xl bg-brand-violet/20 border border-brand-violet/40 flex items-center justify-center text-brand-violet-glow mx-auto shadow-lg shadow-brand-violet/20">
                  <Play className="w-8 h-8 fill-brand-violet-glow ml-1" />
                </div>

                <div>
                  <h2 className="text-2xl font-extrabold text-white font-display mb-1">
                    Launch New Session
                  </h2>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Generates a unique 6-character room code and opens the student waiting room.
                  </p>
                </div>

                {selectedQuiz && (
                  <div className="p-4 rounded-2xl bg-brand-navy border border-brand-border text-left">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Selected Quiz
                    </span>
                    <span className="text-sm font-bold text-white block mt-0.5">
                      {selectedQuiz.title}
                    </span>
                    <span className="text-xs text-brand-cyan font-mono mt-1 block">
                      {(selectedQuiz.questions || []).length} Verified Questions Ready
                    </span>
                  </div>
                )}

                <button
                  onClick={handleCreateSession}
                  disabled={!selectedQuiz}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-violet to-brand-cyan text-white font-bold text-base tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-brand-violet/25 hover:opacity-95 transition-all hover:scale-[1.01]"
                >
                  <Play className="w-5 h-5 fill-white" />
                  Launch Quiz Session
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
