import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Smartphone, ArrowRight, User, Hash, AlertCircle } from 'lucide-react';

export const StudentJoin: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlRoom = searchParams.get('room') || '';

  const [roomCode, setRoomCode] = useState(urlRoom.toUpperCase());
  const [displayName, setDisplayName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (urlRoom) {
      setRoomCode(urlRoom.toUpperCase());
    }
    const savedName = sessionStorage.getItem('quizx_displayName');
    if (savedName) setDisplayName(savedName);
    const savedId = sessionStorage.getItem('quizx_studentId');
    if (savedId) setStudentId(savedId);
  }, [urlRoom]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = roomCode.trim().toUpperCase();
    const cleanName = displayName.trim();
    const cleanId = studentId.trim();

    if (!cleanCode || cleanCode.length < 4) {
      setError('Please enter a valid room code (at least 4 characters)');
      return;
    }

    if (!cleanName || cleanName.length < 2) {
      setError('Please enter a display name (at least 2 characters)');
      return;
    }

    sessionStorage.setItem('quizx_displayName', cleanName);
    if (cleanId) sessionStorage.setItem('quizx_studentId', cleanId);

    navigate(`/play/${cleanCode}`);
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-brand-border/80 shadow-2xl relative">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-violet to-brand-cyan mx-auto flex items-center justify-center text-white mb-3 shadow-lg shadow-brand-violet/20">
              <Smartphone className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              Join Live Arena
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Enter your details to join the live workshop quiz
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-brand-rose/15 border border-brand-rose/30 flex items-center gap-2 text-brand-rose text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Room Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={8}
                  placeholder="e.g. M4S56Y"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3.5 rounded-xl bg-brand-navy border border-brand-border text-white font-mono text-center text-xl tracking-widest placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  maxLength={30}
                  placeholder="Enter your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-brand-navy border border-brand-border text-white text-base placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-violet focus:border-brand-violet"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex justify-between">
                <span>Student ID / Roll No.</span>
                <span className="text-slate-500 lowercase font-normal">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  maxLength={30}
                  placeholder="e.g. 21CS042"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-brand-navy border border-brand-border text-white text-base placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-violet focus:border-brand-violet"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-violet via-purple-600 to-brand-cyan text-white font-bold text-base tracking-wide flex items-center justify-center gap-2 hover:opacity-95 shadow-lg shadow-brand-violet/25 transition-all hover:scale-[1.01] mt-2"
            >
              Enter Waiting Room <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <p className="text-center text-[11px] text-slate-500 mt-5">
            Your score and rank will update live during each question.
          </p>
        </div>
      </main>
    </div>
  );
};
