import React, { useEffect } from 'react';
import { LeaderboardEntry } from '@quizx/shared';
import confetti from 'canvas-confetti';
import { Trophy, Crown, Medal, Award } from 'lucide-react';

interface PodiumProps {
  podium: LeaderboardEntry[];
  triggerConfetti?: boolean;
}

export const Podium: React.FC<PodiumProps> = ({ podium, triggerConfetti = true }) => {
  useEffect(() => {
    if (triggerConfetti) {
      const end = Date.now() + 3000;
      const colors = ['#8B5CF6', '#06B6D4', '#F59E0B', '#10B981'];

      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [triggerConfetti]);

  const first = podium[0];
  const second = podium[1];
  const third = podium[2];

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-violet/20 border border-brand-violet/40 text-brand-violet-glow text-xs font-bold uppercase tracking-wider mb-2">
          <Trophy className="w-4 h-4" /> Grand Winners Podium
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display">
          Top Champions
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end justify-center pt-8">
        {/* 2nd Place (Silver) */}
        <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '150ms' }}>
          {second ? (
            <div className="w-full flex flex-col items-center">
              <div className="relative mb-3">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-slate-300 to-slate-100 border-2 border-slate-300 flex items-center justify-center shadow-lg shadow-slate-300/20">
                  <Medal className="w-8 h-8 text-slate-800" />
                </div>
                <span className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-bold text-xs flex items-center justify-center font-mono">
                  2
                </span>
              </div>
              <p className="font-bold text-xs sm:text-base text-slate-200 text-center truncate max-w-full px-1">
                {second.display_name}
              </p>
              <p className="font-mono text-xs sm:text-sm text-slate-400 font-semibold mb-2">
                {second.score} pts
              </p>
              <div className="w-full h-28 sm:h-36 rounded-t-2xl bg-gradient-to-t from-slate-800/80 to-slate-700/60 border-t-2 border-x-2 border-slate-400/50 flex items-center justify-center">
                <span className="font-display font-extrabold text-2xl sm:text-4xl text-slate-300">2nd</span>
              </div>
            </div>
          ) : (
            <div className="w-full h-28 sm:h-36 rounded-t-2xl bg-brand-surface/20 border-t border-brand-border/40" />
          )}
        </div>

        {/* 1st Place (Gold - Tallest) */}
        <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '0ms' }}>
          {first ? (
            <div className="w-full flex flex-col items-center">
              <div className="relative mb-3">
                <Crown className="w-8 h-8 text-amber-400 absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce-subtle" />
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 border-2 border-amber-400 flex items-center justify-center shadow-xl shadow-amber-500/30">
                  <Trophy className="w-9 h-9 sm:w-11 sm:h-11 text-amber-950" />
                </div>
                <span className="absolute -bottom-2 -right-1 w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-bold text-sm flex items-center justify-center font-mono shadow-md">
                  1
                </span>
              </div>
              <p className="font-bold text-sm sm:text-lg text-amber-300 text-center truncate max-w-full px-1">
                {first.display_name}
              </p>
              <p className="font-mono text-sm sm:text-base text-amber-400 font-extrabold mb-2">
                {first.score} pts
              </p>
              <div className="w-full h-40 sm:h-52 rounded-t-2xl bg-gradient-to-t from-amber-950/80 to-amber-600/40 border-t-2 border-x-2 border-amber-400/60 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <span className="font-display font-extrabold text-3xl sm:text-5xl text-amber-300">1st</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* 3rd Place (Bronze) */}
        <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '300ms' }}>
          {third ? (
            <div className="w-full flex flex-col items-center">
              <div className="relative mb-3">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-800 to-amber-600 border-2 border-amber-700 flex items-center justify-center shadow-lg shadow-amber-900/30">
                  <Award className="w-8 h-8 text-amber-200" />
                </div>
                <span className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-amber-700 text-amber-100 font-bold text-xs flex items-center justify-center font-mono">
                  3
                </span>
              </div>
              <p className="font-bold text-xs sm:text-base text-slate-200 text-center truncate max-w-full px-1">
                {third.display_name}
              </p>
              <p className="font-mono text-xs sm:text-sm text-slate-400 font-semibold mb-2">
                {third.score} pts
              </p>
              <div className="w-full h-20 sm:h-28 rounded-t-2xl bg-gradient-to-t from-stone-900/80 to-amber-900/40 border-t-2 border-x-2 border-amber-700/50 flex items-center justify-center">
                <span className="font-display font-extrabold text-2xl sm:text-4xl text-amber-500">3rd</span>
              </div>
            </div>
          ) : (
            <div className="w-full h-20 sm:h-28 rounded-t-2xl bg-brand-surface/20 border-t border-brand-border/40" />
          )}
        </div>
      </div>
    </div>
  );
};
