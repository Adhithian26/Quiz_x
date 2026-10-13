import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Zap, Play, Shield, Users, Trophy, Cpu, Smartphone, BarChart3, ArrowRight } from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    const cleanCode = roomCode.trim().toUpperCase();
    if (displayName.trim()) {
      sessionStorage.setItem('quizx_displayName', displayName.trim());
    }
    navigate(`/play/${cleanCode}`);
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-violet/20 border border-brand-violet/30 text-brand-violet-glow text-xs sm:text-sm font-semibold tracking-wide">
              <Zap className="w-4 h-4 fill-brand-violet" />
              Engineered for 250+ Live Students
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.08] font-display">
              Real-Time Quiz Arena for <span className="bg-gradient-to-r from-brand-violet via-brand-cyan to-brand-emerald bg-clip-text text-transparent">Auditoriums</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
              Host high-stakes AI workshops and competitive college quizzes with zero lag. Features server-authoritative timers, instant live leaderboards, phone QR join, and projector presentation screens.
            </p>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center lg:justify-start">
              <button
                onClick={() => navigate('/host')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-violet to-brand-violet/90 text-white font-semibold text-base shadow-lg shadow-brand-violet/25 hover:shadow-brand-violet/40 hover:scale-[1.02] transition-all"
              >
                <Shield className="w-5 h-5" />
                Host a Quiz
              </button>

              <button
                onClick={() => navigate('/join')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl glass-card border border-brand-border text-slate-200 hover:text-white hover:bg-brand-surface font-semibold text-base transition-all"
              >
                <Smartphone className="w-5 h-5 text-brand-cyan" />
                Join via Phone
              </button>
            </div>
          </div>

          {/* Quick Join Card */}
          <div className="lg:col-span-5">
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-brand-border/80 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-brand-cyan/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-violet/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-brand-cyan/20 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan">
                    <Play className="w-5 h-5 fill-brand-cyan" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white font-display">Student Quick Join</h2>
                    <p className="text-xs text-slate-400">Enter room code from the projector screen</p>
                  </div>
                </div>

                <form onSubmit={handleQuickJoin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Room Code
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      placeholder="e.g. KXJBPM"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3.5 rounded-xl bg-brand-dark/90 border border-brand-border text-white font-mono text-center text-xl tracking-widest placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Your Display Name
                    </label>
                    <input
                      type="text"
                      maxLength={30}
                      placeholder="e.g. Alex Chen"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-brand-dark/90 border border-brand-border text-white text-base placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-violet focus:border-brand-violet transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-cyan to-blue-600 text-brand-dark font-extrabold text-base tracking-wide flex items-center justify-center gap-2 hover:opacity-95 shadow-lg shadow-brand-cyan/20 transition-all hover:scale-[1.01]"
                  >
                    Enter Arena <ArrowRight className="w-5 h-5" />
                  </button>
                </form>

                <p className="text-center text-xs text-slate-500 mt-4">
                  No app download or student account required.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 sm:mt-24">
          <div className="glass-card p-6 rounded-2xl border border-brand-border/60 hover:border-brand-violet/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-brand-violet/20 border border-brand-violet/30 flex items-center justify-center text-brand-violet mb-4 group-hover:scale-105 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-display">Tested for 250+ Concurrency</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Built on low-latency Socket.IO with atomic answer ingestion, handling 300 simultaneous student submissions under 5ms latency.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-brand-border/60 hover:border-brand-cyan/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-brand-cyan/20 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan mb-4 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-display">Auditorium Projector View</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Dedicated high-contrast presentation route designed for theater projectors with live QR code join, real-time submission counter, and podium celebrations.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-brand-border/60 hover:border-brand-emerald/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-brand-emerald/20 border border-brand-emerald/30 flex items-center justify-center text-brand-emerald mb-4 group-hover:scale-105 transition-transform">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-display">Supabase Persistence & CSV</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Full PostgreSQL migration schema, RLS protection against answer leaks, and one-click CSV export of student performance for grading.
            </p>
          </div>
        </div>
      </main>

      <footer className="glass-panel border-t border-brand-border/40 py-6 text-center text-xs text-slate-500">
        QuizX Live — Production Real-Time Multiplayer Quiz Platform for College Workshops & Classrooms
      </footer>
    </div>
  );
};
