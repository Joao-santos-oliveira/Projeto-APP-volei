import { HashRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import Sidebar from './components/layout/Sidebar';
import PlayersPage from './pages/PlayersPage';
import PlayerDetailPage from './pages/PlayerDetailPage';
import MatchesPage from './pages/MatchesPage';
import LiveScorePage from './pages/LiveScorePage';
import HistoryPage from './pages/HistoryPage';
import MatchHistoryPage from './pages/MatchHistoryPage';
import DashboardPage from './pages/DashboardPage';
import ComparePage from './pages/ComparePage';

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/"             element={<PlayersPage />} />
              <Route path="/players/:id"  element={<PlayerDetailPage />} />
              <Route path="/matches"      element={<MatchesPage />} />
              <Route path="/live/:id"     element={<LiveScorePage />} />
              <Route path="/history"      element={<HistoryPage />} />
              <Route path="/history/:id"  element={<MatchHistoryPage />} />
              <Route path="/dashboard"    element={<DashboardPage />} />
              <Route path="/compare"      element={<ComparePage />} />
            </Routes>
          </main>
        </div>
      </ToastProvider>
    </HashRouter>
  );
}
