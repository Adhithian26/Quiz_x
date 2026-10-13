import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { StudentJoin } from './pages/StudentJoin';
import { StudentPlay } from './pages/StudentPlay';
import { HostDashboard } from './pages/HostDashboard';
import { ProjectorScreen } from './pages/ProjectorScreen';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join" element={<StudentJoin />} />
        <Route path="/play/:roomCode" element={<StudentPlay />} />
        <Route path="/host" element={<HostDashboard />} />
        <Route path="/projector/:roomCode" element={<ProjectorScreen />} />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
