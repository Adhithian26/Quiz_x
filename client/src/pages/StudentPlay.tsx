import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSocket } from '../services/socket';
import { Navbar } from '../components/Navbar';
import { Timer } from '../components/Timer';
import { Podium } from '../components/Podium';
import {
  PublicQuestion,
  SessionStatus,
  OptionKey,
  LeaderboardEntry,
  QuestionRevealedPayload
} from '@quizx/shared';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Trophy,
  WifiOff,
  Flame,
  ArrowRight
} from 'lucide-react';

export const StudentPlay: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const socket = getSocket();

  // Student Identity
  const [participantId, setParticipantId] = useState<string>(() => sessionStorage.getItem('quizx_participantId') || '');
  const [displayName, setDisplayName] = useState<string>(() => sessionStorage.getItem('quizx_displayName') || '');
  const [studentIdentifier] = useState<string>(() => sessionStorage.getItem('quizx_studentId') || '');

  // Live State
  const [connected, setConnected] = useState<boolean>(socket.connected);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('waiting');
  const [currentQuestion, setCurrentQuestion] = useState<PublicQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<OptionKey | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [rank, setRank] = useState<number | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reveal state
  const [revealedResult, setRevealedResult] = useState<{
    correctOption: OptionKey;
    explanation: string;
    isCorrect: boolean;
    pointsEarned: number;
  } | null>(null);

  // Finished state
  const [finalPodium, setFinalPodium] = useState<LeaderboardEntry[]>([]);
  const [finalLeaderboard, setFinalLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Join or Reconnect
  const initStudent = useCallback(() => {
    if (!roomCode) return;

    if (!displayName) {
      // Missing name, redirect to join with room query
      navigate(`/join?room=${roomCode}`);
      return;
    }

    setErrorMessage(null);

    socket.emit(
      'student:join',
      {
        roomCode: roomCode.toUpperCase(),
        displayName,
        studentIdentifier: studentIdentifier || undefined,
        participantId: participantId || undefined
      },
      (res: any) => {
        if (res && res.success) {
          setParticipantId(res.participantId);
          sessionStorage.setItem('quizx_participantId', res.participantId);
          setDisplayName(res.displayName);
          setTotalScore(res.totalScore || 0);
          setSessionStatus(res.sessionStatus || 'waiting');

          if (res.currentQuestion) {
            setCurrentQuestion(res.currentQuestion);
          }
          if (res.hasSubmittedCurrentQuestion) {
            setHasSubmitted(true);
            setSelectedOption(res.selectedOption);
          } else {
            setHasSubmitted(false);
            setSelectedOption(null);
          }
          if (res.revealedResult) {
            setRevealedResult(res.revealedResult);
          }
        } else {
          setErrorMessage(res?.message || 'Failed to join quiz room');
        }
      }
    );
  }, [roomCode, displayName, studentIdentifier, participantId, navigate, socket]);

  useEffect(() => {
    const handleConnect = () => {
      setConnected(true);
      initStudent();
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) {
      initStudent();
    }

    // Socket listeners
    socket.on('question:started', ({ question }: { question: PublicQuestion; deadline: number }) => {
      setCurrentQuestion(question);
      setSessionStatus('question_active');
      setSelectedOption(null);
      setHasSubmitted(false);
      setRevealedResult(null);
    });

    socket.on('question:closed', () => {
      setSessionStatus('question_closed');
    });

    socket.on('question:revealed', (payload: QuestionRevealedPayload) => {
      setSessionStatus('question_revealed');
      // Calculate personal feedback
      const isCorrect = selectedOption === payload.correctOption;
      const points = isCorrect && currentQuestion ? currentQuestion.points : 0;
      if (isCorrect) {
        setTotalScore((prev) => prev + points);
      }
      setRevealedResult({
        correctOption: payload.correctOption,
        explanation: payload.explanation,
        isCorrect,
        pointsEarned: points
      });
    });

    socket.on('leaderboard:update', ({ leaderboard }: { leaderboard: LeaderboardEntry[] }) => {
      setSessionStatus('leaderboard');
      const myEntry = leaderboard.find((p) => p.participant_id === participantId);
      if (myEntry) {
        setTotalScore(myEntry.score);
        setRank(myEntry.rank);
      }
    });

    socket.on('session:finished', ({ leaderboard, podium }: { leaderboard: LeaderboardEntry[]; podium: LeaderboardEntry[] }) => {
      setSessionStatus('finished');
      setFinalPodium(podium);
      setFinalLeaderboard(leaderboard);
      const myEntry = leaderboard.find((p) => p.participant_id === participantId);
      if (myEntry) {
        setTotalScore(myEntry.score);
        setRank(myEntry.rank);
      }
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('question:started');
      socket.off('question:closed');
      socket.off('question:revealed');
      socket.off('leaderboard:update');
      socket.off('session:finished');
    };
  }, [socket, initStudent, participantId, selectedOption, currentQuestion]);

  // Answer Submission Handler
  const handleSelectOption = (option: OptionKey) => {
    if (hasSubmitted || sessionStatus !== 'question_active' || !currentQuestion || !roomCode) {
      return;
    }

    setSelectedOption(option);
    setHasSubmitted(true);

    // Haptic feedback for mobile devices
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    socket.emit(
      'student:submit_answer',
      {
        roomCode: roomCode.toUpperCase(),
        participantId,
        questionId: currentQuestion.id,
        selectedOption: option
      },
      (ack: any) => {
        if (!ack || !ack.accepted) {
          console.warn('[StudentPlay] Answer not accepted:', ack?.message);
        }
      }
    );
  };

  // Option Styling
  const getOptionColors = (key: OptionKey) => {
    switch (key) {
      case 'A':
        return {
          bg: 'bg-brand-violet/20 hover:bg-brand-violet/30 active:bg-brand-violet/40',
          border: 'border-brand-violet/50',
          badge: 'bg-brand-violet text-white',
          text: 'text-white'
        };
      case 'B':
        return {
          bg: 'bg-brand-cyan/20 hover:bg-brand-cyan/30 active:bg-brand-cyan/40',
          border: 'border-brand-cyan/50',
          badge: 'bg-brand-cyan text-brand-dark',
          text: 'text-white'
        };
      case 'C':
        return {
          bg: 'bg-brand-emerald/20 hover:bg-brand-emerald/30 active:bg-brand-emerald/40',
          border: 'border-brand-emerald/50',
          badge: 'bg-brand-emerald text-white',
          text: 'text-white'
        };
      case 'D':
        return {
          bg: 'bg-brand-amber/20 hover:bg-brand-amber/30 active:bg-brand-amber/40',
          border: 'border-brand-amber/50',
          badge: 'bg-brand-amber text-brand-dark',
          text: 'text-white'
        };
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col select-none">
      <Navbar roomCode={roomCode} connected={connected} />

      {/* Disconnect Alert */}
      {!connected && (
        <div className="bg-brand-rose px-4 py-2 text-white text-xs font-semibold flex items-center justify-center gap-2 animate-pulse">
          <WifiOff className="w-4 h-4" />
          <span>Reconnecting to QuizX Live server... please wait.</span>
        </div>
      )}

      {/* Error state */}
      {errorMessage && (
        <div className="max-w-md mx-auto my-6 p-4 rounded-2xl bg-brand-rose/20 border border-brand-rose/40 text-brand-rose text-sm text-center">
          <p className="font-bold">{errorMessage}</p>
          <button
            onClick={() => navigate('/join')}
            className="mt-3 px-4 py-1.5 rounded-xl bg-brand-rose text-white text-xs font-bold"
          >
            Back to Join Page
          </button>
        </div>
      )}

      {/* Student Score Bar */}
      <div className="bg-brand-surface/70 border-b border-brand-border/60 py-2.5 px-4 backdrop-blur-md">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-violet/20 border border-brand-violet/40 flex items-center justify-center text-brand-violet-glow text-xs font-bold">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-white truncate block max-w-[130px] sm:max-w-[200px]">
                {displayName}
              </span>
              {studentIdentifier && (
                <span className="text-[10px] text-slate-400 font-mono -mt-0.5 block truncate">
                  {studentIdentifier}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {rank !== undefined && (
              <div className="flex items-center gap-1 bg-brand-dark/60 border border-brand-border/80 px-2.5 py-1 rounded-full text-xs">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400 font-medium">Rank</span>
                <span className="font-mono font-bold text-white">#{rank}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-brand-violet/20 border border-brand-violet/40 px-3 py-1 rounded-full text-xs">
              <Flame className="w-3.5 h-3.5 text-brand-cyan fill-brand-cyan/20" />
              <span className="font-mono font-extrabold text-white text-sm">{totalScore}</span>
              <span className="text-brand-violet-glow text-[10px] font-bold uppercase">PTS</span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 flex flex-col justify-center max-w-lg w-full mx-auto p-4 sm:p-6">
        {/* ==================================================== */}
        {/* STATE 1: WAITING ROOM                                */}
        {/* ==================================================== */}
        {sessionStatus === 'waiting' && (
          <div className="text-center py-10 glass-panel rounded-3xl p-6 sm:p-8 border border-brand-border animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-brand-cyan/15 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan mx-auto mb-5 shadow-lg shadow-brand-cyan/10">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display mb-2">
              You're in the Arena!
            </h2>
            <p className="text-sm text-slate-300 max-w-xs mx-auto mb-6">
              Waiting for the host to launch the first question on the screen...
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-navy border border-brand-border text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-emerald animate-pulse" />
              <span>Ready for Question 1</span>
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-brand-navy/60 border border-brand-border/60 text-left">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-cyan" /> Speed Tip
              </p>
              <p className="text-xs text-slate-300">
                Keep your phone unlocked. Questions appear simultaneously on your screen with four touch-friendly buttons.
              </p>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STATE 2: ACTIVE QUESTION                             */}
        {/* ==================================================== */}
        {sessionStatus === 'question_active' && currentQuestion && (
          <div className="flex-1 flex flex-col justify-between space-y-4 animate-fade-in">
            {/* Header: Progress & Timer */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-cyan">
                  Question {currentQuestion.question_order} of {currentQuestion.total_questions}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-400 font-medium">Worth</span>
                  <span className="text-xs font-bold text-white bg-brand-surface px-2 py-0.5 rounded-md border border-brand-border">
                    {currentQuestion.points} pts
                  </span>
                </div>
              </div>

              <Timer
                deadlineTimestamp={currentQuestion.deadline_timestamp}
                totalSeconds={currentQuestion.time_limit_seconds}
                size="normal"
              />
            </div>

            {/* Question Text */}
            <div className="glass-card p-5 rounded-2xl border border-brand-border/80 shadow-md">
              <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
                {currentQuestion.question_text}
              </h2>
            </div>

            {/* Answer Options Grid */}
            <div className="grid grid-cols-1 gap-3 py-1">
              {currentQuestion.options.map((option) => {
                const colors = getOptionColors(option.key);
                const isSelected = selectedOption === option.key;

                let cardClasses = `relative p-4 rounded-2xl border-2 flex items-center gap-3.5 transition-all text-left ${colors.bg} ${colors.border}`;

                if (hasSubmitted) {
                  if (isSelected) {
                    cardClasses = `relative p-4 rounded-2xl border-2 border-brand-cyan bg-brand-cyan/25 shadow-lg shadow-brand-cyan/20 flex items-center gap-3.5`;
                  } else {
                    cardClasses = `relative p-4 rounded-2xl border border-brand-border/40 bg-brand-surface/20 opacity-40 flex items-center gap-3.5`;
                  }
                }

                return (
                  <button
                    key={option.key}
                    onClick={() => handleSelectOption(option.key)}
                    disabled={hasSubmitted}
                    className={cardClasses}
                  >
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 shadow-sm ${colors.badge}`}>
                      {option.key}
                    </span>
                    <span className="font-semibold text-sm sm:text-base text-slate-100 flex-1 leading-snug">
                      {option.text}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-brand-cyan shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Status Footer */}
            {hasSubmitted ? (
              <div className="p-3.5 rounded-xl bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan text-center text-xs font-bold animate-pulse">
                ✓ Answer recorded! Waiting for question to close...
              </div>
            ) : (
              <div className="text-center text-xs text-slate-400 font-medium py-1">
                Tap an option to lock in your answer
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* STATE 3: QUESTION CLOSED                             */}
        {/* ==================================================== */}
        {sessionStatus === 'question_closed' && (
          <div className="text-center py-12 glass-panel rounded-3xl p-6 border border-brand-border animate-fade-in">
            <Clock className="w-12 h-12 text-brand-amber mx-auto mb-3 animate-pulse" />
            <h2 className="text-2xl font-extrabold text-white font-display mb-1">
              Time's Up!
            </h2>
            <p className="text-sm text-slate-400">
              Evaluating responses... host will reveal the correct answer shortly.
            </p>
          </div>
        )}

        {/* ==================================================== */}
        {/* STATE 4: QUESTION REVEALED                           */}
        {/* ==================================================== */}
        {sessionStatus === 'question_revealed' && revealedResult && (
          <div className="space-y-4 animate-slide-up">
            {/* Feedback Banner */}
            <div
              className={`p-5 rounded-2xl border-2 flex items-center gap-4 ${
                revealedResult.isCorrect
                  ? 'bg-brand-emerald/20 border-brand-emerald shadow-lg shadow-brand-emerald/20'
                  : 'bg-brand-rose/20 border-brand-rose shadow-lg shadow-brand-rose/20'
              }`}
            >
              {revealedResult.isCorrect ? (
                <div className="w-12 h-12 rounded-2xl bg-brand-emerald flex items-center justify-center text-white shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-brand-rose flex items-center justify-center text-white shrink-0">
                  <XCircle className="w-7 h-7" />
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  {revealedResult.isCorrect ? 'Correct! Outstanding!' : 'Not Quite!'}
                </h3>
                <p className="text-xs text-slate-300 font-medium">
                  {revealedResult.isCorrect
                    ? `+${revealedResult.pointsEarned} points awarded`
                    : `Correct option was [${revealedResult.correctOption}]`}
                </p>
              </div>
            </div>

            {/* Explanation Card */}
            {revealedResult.explanation && (
              <div className="glass-card p-5 rounded-2xl border border-brand-border">
                <div className="flex items-center gap-1.5 text-brand-cyan text-xs font-bold uppercase tracking-wider mb-2">
                  <HelpCircle className="w-4 h-4" /> Explanation
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {revealedResult.explanation}
                </p>
              </div>
            )}

            <div className="text-center py-2 text-xs text-slate-400">
              Look at the projector screen for the live leaderboard ranking.
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STATE 5: LEADERBOARD DISPLAY                         */}
        {/* ==================================================== */}
        {sessionStatus === 'leaderboard' && (
          <div className="text-center py-10 glass-panel rounded-3xl p-6 border border-brand-border animate-fade-in">
            <Trophy className="w-14 h-14 text-amber-400 mx-auto mb-3" />
            <h2 className="text-2xl font-extrabold text-white font-display mb-1">
              Leaderboard In Progress
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Check the auditorium projector screen for the top ranks!
            </p>

            <div className="inline-flex items-center gap-4 bg-brand-surface px-6 py-3 rounded-2xl border border-brand-border">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Your Score</span>
                <span className="font-mono font-extrabold text-xl text-white">{totalScore} pts</span>
              </div>
              {rank && (
                <div className="text-left border-l border-brand-border pl-4">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Your Rank</span>
                  <span className="font-mono font-extrabold text-xl text-brand-cyan">#{rank}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STATE 6: FINISHED & PODIUM                           */}
        {/* ==================================================== */}
        {sessionStatus === 'finished' && (
          <div className="space-y-6 animate-fade-in">
            <Podium podium={finalPodium} triggerConfetti={true} />

            <div className="glass-panel p-6 rounded-3xl border border-brand-border text-center">
              <h3 className="text-lg font-bold text-white font-display mb-2">
                Your Final Performance
              </h3>
              <div className="flex justify-center items-center gap-6 my-3">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-bold block">Final Rank</span>
                  <span className="font-mono font-extrabold text-2xl text-brand-cyan">#{rank || '-'}</span>
                </div>
                <div className="w-px h-8 bg-brand-border" />
                <div>
                  <span className="text-xs text-slate-400 uppercase font-bold block">Final Score</span>
                  <span className="font-mono font-extrabold text-2xl text-white">{totalScore} pts</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4">
                Thank you for participating in the AI Workshop Challenge Arena!
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
