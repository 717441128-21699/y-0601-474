import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { MainLayout } from './components/MainLayout';
import Login from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CourtroomPage } from './pages/CourtroomPage';
import { DossierPage } from './pages/DossierPage';
import { DetentionPage } from './pages/DetentionPage';
import { TranscriptPage } from './pages/TranscriptPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { useAuthStore } from './store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isLoggedIn } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) return null;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/courtroom" element={<CourtroomPage />} />
        <Route path="/dossier" element={<DossierPage />} />
        <Route path="/detention" element={<DetentionPage />} />
        <Route path="/transcript" element={<TranscriptPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;
