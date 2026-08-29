import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/layout/Sidebar';
import LoginPage from './pages/LoginPage';
import PlayersPage from './pages/PlayersPage';
import PlayerDetailPage from './pages/PlayerDetailPage';
import TeamsPage from './pages/TeamsPage';
import TeamDetailPage from './pages/TeamDetailPage';
import MatchesPage from './pages/MatchesPage';
import LiveScorePage from './pages/LiveScorePage';
import HistoryPage from './pages/HistoryPage';
import MatchHistoryPage from './pages/MatchHistoryPage';
import DashboardPage from './pages/DashboardPage';
import ComparePage from './pages/ComparePage';

function ProtectedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/"             element={<PlayersPage />} />
          <Route path="/players/:id"  element={<PlayerDetailPage />} />
          <Route path="/teams"        element={<TeamsPage />} />
          <Route path="/teams/:id"    element={<TeamDetailPage />} />
          <Route path="/matches"      element={<MatchesPage />} />
          <Route path="/live/:id"     element={<LiveScorePage />} />
          <Route path="/history"      element={<HistoryPage />} />
          <Route path="/history/:id"  element={<MatchHistoryPage />} />
          <Route path="/dashboard"    element={<DashboardPage />} />
          <Route path="/compare"      element={<ComparePage />} />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <ProtectedApp />
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  );
}
