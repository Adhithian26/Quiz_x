import React from 'react';
import { LeaderboardEntry } from '@quizx/shared';
import { Trophy, Medal, Award, Flame } from 'lucide-react';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentParticipantId?: string;
  maxDisplay?: number;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  entries,
  currentParticipantId,
  maxDisplay = 10
}) => {
  const displayedEntries = entries.slice(0, maxDisplay);

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 glass-card rounded-2xl border border-brand-border">
        <Trophy className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-60" />
        <p className="text-slate-400 font-medium">No scores recorded yet</p>
        <p className="text-xs text-slate-500 mt-1">Leaderboard updates live as questions are answered.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2.5">
      {displayedEntries.map((entry) => {
        const isSelf = currentParticipantId === entry.participant_id;

        let rankBadge;
        let cardBorder = 'border-brand-border/60';
        let cardBg = 'bg-brand-surface/40 hover:bg-brand-surface/70';

        if (entry.rank === 1) {
          rankBadge = (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-brand-dark font-bold shadow-md shadow-amber-500/20">
              <Trophy className="w-5 h-5 text-brand-dark" />
            </div>
          );
          cardBorder = 'border-amber-500/50';
          cardBg = 'bg-gradient-to-r from-amber-500/10 via-brand-surface/60 to-brand-surface/40';
        } else if (entry.rank === 2) {
          rankBadge = (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center text-brand-dark font-bold shadow-md shadow-slate-300/20">
              <Medal className="w-5 h-5 text-brand-dark" />
            </div>
          );
          cardBorder = 'border-slate-400/40';
          cardBg = 'bg-gradient-to-r from-slate-300/10 via-brand-surface/60 to-brand-surface/40';
        } else if (entry.rank === 3) {
          rankBadge = (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-700 to-amber-800 flex items-center justify-center text-white font-bold shadow-md shadow-amber-800/20">
              <Award className="w-5 h-5 text-amber-200" />
            </div>
          );
          cardBorder = 'border-amber-700/40';
          cardBg = 'bg-gradient-to-r from-amber-700/10 via-brand-surface/60 to-brand-surface/40';
        } else {
          rankBadge = (
            <div className="w-9 h-9 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center text-slate-300 font-mono font-bold text-sm">
              #{entry.rank}
            </div>
          );
        }

        if (isSelf) {
          cardBorder = 'border-brand-cyan shadow-lg shadow-brand-cyan/20 ring-1 ring-brand-cyan';
          cardBg = 'bg-brand-cyan/15';
        }

        return (
          <div
            key={entry.participant_id}
            className={`flex items-center justify-between p-3.5 rounded-2xl border ${cardBorder} ${cardBg} backdrop-blur-md transition-all duration-200`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {rankBadge}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-sm sm:text-base truncate ${isSelf ? 'text-brand-cyan font-bold' : 'text-slate-100'}`}>
                    {entry.display_name}
                  </span>
                  {isSelf && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30">
                      YOU
                    </span>
                  )}
                </div>
                {entry.student_identifier && (
                  <span className="text-xs text-slate-400 font-mono truncate block">
                    ID: {entry.student_identifier}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pl-3">
              {entry.score > 0 && <Flame className="w-4 h-4 text-brand-amber fill-brand-amber/30 hidden sm:block" />}
              <span className="font-mono font-extrabold text-base sm:text-lg text-white">
                {entry.score}
              </span>
              <span className="text-xs text-slate-400 uppercase font-medium">pts</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
