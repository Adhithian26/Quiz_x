import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Zap, Monitor, Shield, Users } from 'lucide-react';

interface NavbarProps {
  roomCode?: string;
  connected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ roomCode, connected = true }) => {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-brand-border/60 bg-brand-dark/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-violet to-brand-cyan flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Quiz<span className="text-brand-cyan">X</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-violet/20 text-brand-violet-glow border border-brand-violet/30 uppercase tracking-wider">
                Live
              </span>
            </div>
          </div>
        </Link>

        {/* Room badge if active */}
        {roomCode && (
          <div className="flex items-center gap-3 bg-brand-surface/80 border border-brand-border px-3.5 py-1.5 rounded-full">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Room</span>
            <span className="font-mono font-bold text-sm tracking-widest text-brand-cyan">{roomCode}</span>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-emerald animate-pulse' : 'bg-brand-rose'}`} />
          </div>
        )}

        {/* Action Links */}
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/join"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              location.pathname === '/join'
                ? 'bg-brand-surface text-brand-cyan'
                : 'text-slate-300 hover:text-white hover:bg-brand-surface/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Join</span>
          </Link>

          <Link
            to="/host"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              location.pathname.startsWith('/host')
                ? 'bg-brand-violet text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-brand-surface/50'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Host</span>
          </Link>

          {roomCode && (
            <Link
              to={`/projector/${roomCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-brand-surface/50 transition-colors"
              title="Open Projector Screen"
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden md:inline">Projector</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};
